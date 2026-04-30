import { resolveAddressWithBackend } from "../core/api/addressClient.js";
import {
  createAddress,
  deleteAddress,
  getXsrfFromCookieString,
  searchAddresses,
} from "../core/api/hourglassApi.js";
import { fetchTerritoryForLatLon } from "../core/domain/territoryFinder.js";
import { buildHourglassAddressPayload } from "../core/domain/addressRequest.js";
import { findAddressToDelete } from "../core/domain/findAddressToDelete.js";

const defaultDeps = {
  resolveAddressWithBackend,
  createAddress,
  deleteAddress,
  searchAddresses,
  getXsrfFromCookieString,
  fetchTerritoryForLatLon,
  buildHourglassAddressPayload,
  findAddressToDelete,
};

function sortByOperation(candidates) {
  const creates = candidates.filter((c) => c.operation !== "delete");
  const deletes = candidates.filter((c) => c.operation === "delete");
  return [...creates, ...deletes];
}

let deps = { ...defaultDeps };

export function setPopupDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

function getActiveTabId() {
  return chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (!tab?.id) {
      throw new Error("Não foi possível acessar a aba ativa.");
    }

    return tab.id;
  });
}

async function getCookieStringFromTab(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.cookie || "",
  });

  return typeof result?.result === "string" ? result.result : "";
}

function createPreviewRow(label, value, onCommit) {
  const row = document.createElement("div");
  row.className = "preview-row";

  const labelElement = document.createElement("span");
  labelElement.className = "preview-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("span");
  valueElement.className = "preview-value";
  valueElement.textContent = value;

  if (typeof onCommit === "function") {
    bindEditableValue(valueElement, value, onCommit);
  }

  row.append(labelElement, valueElement);
  return row;
}

function bindEditableValue(valueElement, originalValue, onCommit) {
  valueElement.classList.add("editable");
  valueElement.contentEditable = "true";
  valueElement.spellcheck = false;
  valueElement.title = "Clique para editar";

  valueElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      valueElement.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      valueElement.textContent = originalValue;
      valueElement.blur();
    }
  });

  valueElement.addEventListener("blur", () => {
    const nextValue = valueElement.textContent.trim();
    valueElement.textContent = nextValue;
    if (nextValue !== originalValue) {
      onCommit(nextValue);
    }
  });
}

export function setupPopup() {
  const addressInput = document.getElementById("addressInput");
  const fillButton = document.getElementById("fillButton");
  const messageBox = document.getElementById("messageBox");
  const previewPanel = document.getElementById("previewPanel");
  const candidatePicker = document.getElementById("candidatePicker");
  const candidateList = document.getElementById("candidateList");
  const previewSummary = document.getElementById("previewSummary");
  const previewJson = document.getElementById("previewJson");
  const openSettings = document.getElementById("openSettings");
  let pendingSubmission = null;

  if (
    !addressInput ||
    !fillButton ||
    !messageBox ||
    !previewPanel ||
    !candidatePicker ||
    !candidateList ||
    !previewSummary ||
    !previewJson
  ) {
    console.error("[Popup Error] Missing popup elements.");
    return;
  }

  // Open settings page
  openSettings?.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  function setMessage(message, kind = "error") {
    messageBox.textContent = message;
    messageBox.dataset.kind = kind;
    messageBox.classList.add("show");
  }

  function hideMessage() {
    messageBox.classList.remove("show");
    messageBox.textContent = "";
    delete messageBox.dataset.kind;
  }

  function resetPreview() {
    pendingSubmission = null;
    candidateList.replaceChildren();
    candidatePicker.hidden = true;
    previewSummary.replaceChildren();
    previewJson.textContent = "";
    previewPanel.classList.remove("show");
  }

  function showPreview(payload, territory, selectedIndex, candidates) {
    function commitField(key, value) {
      payload[key] = value;
      previewJson.textContent = JSON.stringify(payload, null, 2);
      renderCandidateOptions(candidates, selectedIndex);
    }

    const rows = [
      ["Candidatos", `${selectedIndex + 1} de ${candidates.length}`],
      ["Território", `${territory.number || territory.id}`],
      ["Territory ID", String(payload.territoryId)],
      ["Line 1", payload.line1, (v) => commitField("line1", v)],
      ["Line 2", payload.line2 || "", (v) => commitField("line2", v)],
      ["Cidade", payload.city, (v) => commitField("city", v)],
      ["Estado", payload.state, (v) => commitField("state", v.toUpperCase())],
      ["CEP", payload.postalcode, (v) => commitField("postalcode", v)],
      ["Localização", `${payload.location.y}, ${payload.location.x}`],
      ["Sort order", String(payload.sortOrder)],
      ["DNC", String(payload.dnc)],
      ["Hide on map", String(payload.hideOnMap)],
    ];

    previewSummary.replaceChildren(
      ...rows.map(([label, value, onCommit]) => createPreviewRow(label, value, onCommit))
    );
    previewJson.textContent = JSON.stringify(payload, null, 2);
    previewPanel.classList.add("show");
  }

  function formatCandidateLabel(candidate, index) {
    const opTag = candidate.operation === "delete" ? "[delete]" : "[create]";
    const payload = candidate._payload;
    const baseParts = payload
      ? [payload.line1, payload.city, payload.state, payload.postalcode]
      : [candidate.street, candidate.number, candidate.apt, candidate.city, candidate.state, candidate.cep];

    const parts = [`#${index + 1}`, opTag, ...baseParts];

    if (candidate.operation === "delete" && candidate._searchResult) {
      const { status, matches } = candidate._searchResult;
      if (status === "none") parts.push("(no match)");
      else if (status === "many") parts.push(`(${matches.length} matches)`);
      else parts.push(`(id ${matches[0].id})`);
    }

    return parts.filter(Boolean).join(" - ");
  }

  function renderCandidateOptions(candidates, selectedIndex) {
    candidateList.replaceChildren(
      ...candidates.map((candidate, index) => {
        const item = document.createElement("div");
        item.className = "candidate-row";
        item.setAttribute("role", "listitem");
        item.dataset.index = String(index);

        const label = document.createElement("div");
        label.className = "candidate-label";
        label.setAttribute("aria-label", formatCandidateLabel(candidate, index));
        label.textContent = formatCandidateLabel(candidate, index);
        label.style.cursor = "pointer";
        label.addEventListener("click", async () => {
          try {
            await renderSelectedCandidate(index);
          } catch (err) {
            console.error("[Popup Error]", err);
            setMessage(err.message || "Não foi possível atualizar a pré-visualização.");
          }
        });

        const actions = document.createElement("div");
        actions.className = "candidate-actions";

        const denyBtn = document.createElement("button");
        denyBtn.type = "button";
        denyBtn.className = "secondary-button";
        denyBtn.textContent = "Deny";
        denyBtn.setAttribute("aria-label", `Deny candidate ${index + 1}`);
        denyBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          handleDenyCandidate(index);
        });

        const acceptBtn = document.createElement("button");
        acceptBtn.type = "button";
        acceptBtn.className = "accept-button";
        acceptBtn.textContent = "Accept";
        acceptBtn.setAttribute("aria-label", `Accept candidate ${index + 1}`);
        acceptBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          handleAcceptCandidate(index);
        });

        actions.append(denyBtn, acceptBtn);
        item.append(label, actions);

        if (index === selectedIndex) {
          item.classList.add("selected");
        }

        return item;
      })
    );

    candidatePicker.hidden = candidates.length === 0;
  }

  async function renderSelectedCandidate(selectedIndex) {
    if (!pendingSubmission) {
      return;
    }

    const candidate = pendingSubmission.candidates[selectedIndex];
    if (!candidate) {
      throw new Error("Não foi possível selecionar o endereço normalizado.");
    }

    if (candidate.operation === "delete") {
      await renderDeleteCandidate(candidate, selectedIndex);
      return;
    }

    let payload = candidate._payload;
    let territory = candidate._territory;

    if (!payload || !territory) {
      territory = await deps.fetchTerritoryForLatLon(
        candidate.lat,
        candidate.lon,
        { xsrfToken: pendingSubmission.xsrfToken }
      );

      if (!territory) {
        throw new Error("Não foi possível identificar o território desse endereço.");
      }

      payload = deps.buildHourglassAddressPayload(candidate, candidate, territory);
      candidate._payload = payload;
      candidate._territory = territory;
    }

    pendingSubmission.selectedIndex = selectedIndex;
    pendingSubmission.payload = payload;
    pendingSubmission.territory = territory;
    renderCandidateOptions(pendingSubmission.candidates, selectedIndex);
    showPreview(payload, territory, selectedIndex, pendingSubmission.candidates);
  }

  async function renderDeleteCandidate(candidate, selectedIndex) {
    if (!candidate._searchResult) {
      candidate._searchResult = await deps.findAddressToDelete(candidate, {
        searchAddresses: deps.searchAddresses,
        xsrfToken: pendingSubmission.xsrfToken,
      });
      candidate._selectedMatchIndex = 0;
    }

    const result = candidate._searchResult;

    if (result.status === "none") {
      setMessage(
        `Sem correspondência para "${candidate.street} ${candidate.number}". Pulando candidato.`,
        "info",
      );
      removeCandidateAt(selectedIndex);
      return;
    }

    pendingSubmission.selectedIndex = selectedIndex;
    pendingSubmission.payload = null;
    pendingSubmission.territory = null;
    renderCandidateOptions(pendingSubmission.candidates, selectedIndex);
    showDeletePreview(candidate, result, selectedIndex);
  }

  function showDeletePreview(candidate, result, selectedIndex) {
    const matchIndex = candidate._selectedMatchIndex || 0;
    const selected = result.matches[matchIndex];
    const total = pendingSubmission.candidates.length;

    const baseRows = [
      ["Candidatos", `${selectedIndex + 1} de ${total}`],
      ["Operação", "Deletar"],
      ["Buscar por", `${candidate.street}, ${candidate.number}`],
      ["Query usada", result.query],
      ["Resultados", String(result.matches.length)],
    ];

    if (result.matches.length > 1) {
      baseRows.push(["Match selecionado", `${matchIndex + 1} de ${result.matches.length}`]);
    }

    baseRows.push(
      ["ID", String(selected.id)],
      ["Line 1", selected.line1 || ""],
      ["Line 2", selected.line2 || ""],
      ["Cidade", selected.city || ""],
      ["Estado", selected.state || ""],
      ["CEP", selected.postalcode || ""],
    );

    const rowEls = baseRows.map(([label, value]) => createPreviewRow(label, value));

    if (result.matches.length > 1) {
      rowEls.push(buildMatchPicker(candidate, result, selectedIndex));
    }

    previewSummary.replaceChildren(...rowEls);
    previewJson.textContent = JSON.stringify(selected, null, 2);
    previewPanel.classList.add("show");
  }

  function buildMatchPicker(candidate, result, selectedIndex) {
    const picker = document.createElement("div");
    picker.className = "delete-match-picker";

    const heading = document.createElement("div");
    heading.className = "preview-label";
    heading.textContent = "Escolha o endereço a deletar:";
    picker.appendChild(heading);

    result.matches.forEach((match, idx) => {
      const row = document.createElement("div");
      row.className = "delete-match-row";
      if (idx === (candidate._selectedMatchIndex || 0)) row.classList.add("selected");
      row.style.cursor = "pointer";
      row.textContent = `#${idx + 1} - ${match.line1 || "?"} (line2: ${match.line2 || "-"}) - id ${match.id}`;
      row.addEventListener("click", () => {
        candidate._selectedMatchIndex = idx;
        showDeletePreview(candidate, result, selectedIndex);
        renderCandidateOptions(pendingSubmission.candidates, selectedIndex);
      });
      picker.appendChild(row);
    });

    return picker;
  }

  function removeCandidateAt(index) {
    pendingSubmission.candidates.splice(index, 1);
    if (pendingSubmission.candidates.length === 0) {
      resetPreview();
      return;
    }
    const newIndex = Math.min(index, pendingSubmission.candidates.length - 1);
    pendingSubmission.selectedIndex = newIndex;
    renderCandidateOptions(pendingSubmission.candidates, newIndex);
    renderSelectedCandidate(newIndex).catch((err) => {
      console.error("[Popup Error]", err);
      setMessage(err.message || "Não foi possível atualizar a pré-visualização.");
    });
  }

  function handleDenyCandidate(index) {
    if (!pendingSubmission) return;
    hideMessage();

    const candidates = pendingSubmission.candidates;
    if (index < 0 || index >= candidates.length) return;

    candidates.splice(index, 1);

    if (candidates.length === 0) {
      resetPreview();
      setMessage("Todos os candidatos foram recusados.", "info");
      return;
    }

    const newIndex = Math.min(pendingSubmission.selectedIndex || 0, candidates.length - 1);
    pendingSubmission.selectedIndex = newIndex;
    renderCandidateOptions(candidates, newIndex);
    // Attempt to render the new selected candidate
    renderSelectedCandidate(newIndex).catch((err) => {
      console.error("[Popup Error]", err);
      setMessage(err.message || "Não foi possível atualizar a pré-visualização.");
    });
  }

  async function handleAcceptCandidate(index) {
    if (!pendingSubmission) {
      setMessage("Nenhuma submissão pronta para enviar.");
      return;
    }

    const candidate = pendingSubmission.candidates[index];
    if (!candidate) return;

    if (candidate.operation === "delete") {
      await handleAcceptDelete(candidate, index);
      return;
    }

    await handleAcceptCreate(index);
  }

  async function handleAcceptCreate(index) {
    const needsRebuild =
      index !== pendingSubmission.selectedIndex || !pendingSubmission.payload;

    if (needsRebuild) {
      try {
        await renderSelectedCandidate(index);
      } catch (err) {
        console.error("[Popup Error]", err);
        setMessage(err.message || "Não foi possível preparar a submissão para esse candidato.");
        return;
      }
    }

    fillButton.disabled = true;

    try {
      await deps.createAddress(pendingSubmission.payload, {
        xsrfToken: pendingSubmission.xsrfToken,
      });
      setMessage("Endereço criado no Hourglass.", "success");
      removeCandidateAt(index);
    } catch (error) {
      console.error("[Popup Error]", error);
      setMessage(error.message || "Não foi possível enviar o endereço.");
    } finally {
      fillButton.disabled = false;
    }
  }

  async function handleAcceptDelete(candidate, index) {
    if (index !== pendingSubmission.selectedIndex || !candidate._searchResult) {
      try {
        await renderSelectedCandidate(index);
      } catch (err) {
        console.error("[Popup Error]", err);
        setMessage(err.message || "Não foi possível buscar o endereço para deletar.");
        return;
      }
    }

    const result = candidate._searchResult;
    if (!result || result.status === "none") {
      setMessage("Nenhum endereço encontrado para deletar.");
      return;
    }

    const matchIdx = candidate._selectedMatchIndex || 0;
    const match = result.matches[matchIdx];
    if (!match) {
      setMessage("Selecione qual endereço deletar.");
      return;
    }

    fillButton.disabled = true;

    try {
      await deps.deleteAddress(match.id, { xsrfToken: pendingSubmission.xsrfToken });
      setMessage(`Endereço "${match.line1}" (id ${match.id}) deletado.`, "success");
      removeCandidateAt(index);
    } catch (error) {
      console.error("[Popup Error]", error);
      setMessage(error.message || "Não foi possível deletar o endereço.");
    } finally {
      fillButton.disabled = false;
    }
  }

  function setButtonLoading(isLoading, label = "Pré-visualizar") {
    fillButton.disabled = isLoading;
    fillButton.textContent = isLoading ? "Processando..." : label;
  }

  fillButton.addEventListener("click", async () => {
    hideMessage();
    resetPreview();
    const rawAddress = addressInput.value?.trim();

    if (!rawAddress) {
      setMessage("Por favor, insira um endereço.");
      return;
    }

    setButtonLoading(true);

    try {
      const resolved = await deps.resolveAddressWithBackend(rawAddress);

      if (!Array.isArray(resolved) || resolved.length === 0) {
        setMessage("Não foi possível interpretar o endereço. Verifique o formato e a configuração do backend.");
        return;
      }

      const candidates = sortByOperation(resolved);

      const tabId = await getActiveTabId();
      const cookieString = await getCookieStringFromTab(tabId);
      const xsrfToken = deps.getXsrfFromCookieString(cookieString);

      if (!xsrfToken) {
        throw new Error("Não foi possível localizar o token XSRF na aba ativa.");
      }

      pendingSubmission = {
        candidates,
        payload: null,
        territory: null,
        selectedIndex: 0,
        tabId,
        xsrfToken,
      };

      // Render per-candidate list and show preview for the first candidate
      renderCandidateOptions(candidates, 0);
      await renderSelectedCandidate(0);
      setMessage(
        candidates.length > 1
          ? "Há múltiplos endereços normalizados. Escolha um candidato e revise a submissão."
          : "Revise os dados e aprove a submissão quando estiver pronto.",
        "info"
      );
    } catch (error) {
      console.error("[Popup Error]", error);
      setMessage(error.message || "Erro ao processar endereço. Tente novamente.");
      resetPreview();
    } finally {
      setButtonLoading(false);
    }
  });

}

