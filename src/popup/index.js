import { resolveAddressWithBackend } from "../core/api/addressClient.js";
import { createAddress, getXsrfFromCookieString } from "../core/api/hourglassApi.js";
import { fetchTerritoryForLatLon } from "../core/domain/territoryFinder.js";
import { buildHourglassAddressPayload } from "../core/domain/addressRequest.js";

const defaultDeps = {
  resolveAddressWithBackend,
  createAddress,
  getXsrfFromCookieString,
  fetchTerritoryForLatLon,
  buildHourglassAddressPayload,
};

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
    const payload = candidate._payload;
    const parts = payload
      ? [`#${index + 1}`, payload.line1, payload.city, payload.state, payload.postalcode]
      : [
          `#${index + 1}`,
          candidate.street,
          candidate.number,
          candidate.apt,
          candidate.city,
          candidate.state,
          candidate.cep,
        ];

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

      pendingSubmission.candidates.splice(index, 1);

      if (pendingSubmission.candidates.length === 0) {
        resetPreview();
      } else {
        const newIndex = Math.min(index, pendingSubmission.candidates.length - 1);
        pendingSubmission.selectedIndex = newIndex;
        renderCandidateOptions(pendingSubmission.candidates, newIndex);
        renderSelectedCandidate(newIndex).catch((err) => {
          console.error("[Popup Error]", err);
          setMessage(err.message || "Não foi possível atualizar a pré-visualização.");
        });
      }
    } catch (error) {
      console.error("[Popup Error]", error);
      setMessage(error.message || "Não foi possível enviar o endereço.");
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
      const candidates = await deps.resolveAddressWithBackend(rawAddress);

      if (!Array.isArray(candidates) || candidates.length === 0) {
        setMessage("Não foi possível interpretar o endereço. Verifique o formato e a configuração do backend.");
        return;
      }

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

