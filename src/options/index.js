import {
  getBackendConfig,
  normalizeBackendUrl,
  setBackendConfig,
} from "../core/config/backendConfig.js";

document.addEventListener("DOMContentLoaded", async () => {
  const backendUrlInput = document.getElementById("backendUrl");
  const backendTokenInput = document.getElementById("backendToken");
  const form = document.getElementById("settingsForm");
  const saveButton = document.getElementById("saveButton");
  const checkConnectionButton = document.getElementById("checkConnectionButton");
  const messageDiv = document.getElementById("message");

  if (
    !backendUrlInput ||
    !backendTokenInput ||
    !form ||
    !saveButton ||
    !checkConnectionButton ||
    !messageDiv
  ) {
    console.error("[Options Error] Missing settings elements.");
    return;
  }

  try {
    const config = await getBackendConfig();
    backendUrlInput.value = config.baseUrl;
    backendTokenInput.value = config.authToken;
  } catch (error) {
    console.error("Error loading settings:", error);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const backendUrl = backendUrlInput.value.trim();
    if (!backendUrl) {
      showMessage("Por favor, insira a URL do backend.", "error");
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";

    const saved = await setBackendConfig({
      baseUrl: normalizeBackendUrl(backendUrl),
      authToken: backendTokenInput.value.trim(),
    });

    if (saved) {
      showMessage("Configurações salvas com sucesso!", "success");
      saveButton.textContent = "Salvar Configurações";
      saveButton.disabled = false;
      return;
    }

    console.error("Error saving settings:");
    showMessage("Erro ao salvar configurações. Tente novamente.", "error");
    saveButton.textContent = "Salvar Configurações";
    saveButton.disabled = false;
  });

  checkConnectionButton.addEventListener("click", async () => {
    hideMessage();

    const backendUrl = normalizeBackendUrl(backendUrlInput.value);
    const authToken = backendTokenInput.value.trim();

    if (!backendUrl) {
      showMessage("Por favor, insira a URL do backend.", "error");
      return;
    }

    const originalLabel = checkConnectionButton.textContent;
    checkConnectionButton.disabled = true;
    saveButton.disabled = true;
    checkConnectionButton.textContent = "Testando...";

    try {
      const response = await fetchBackendConnection(backendUrl, authToken);

      showMessage(
        `Conexão com o backend validada com sucesso (status ${response.status}).`,
        "success"
      );
    } catch (error) {
      console.error("Error checking backend connection:", error);
      showMessage(
        error.message || "Não foi possível conectar ao backend.",
        "error"
      );
    } finally {
      checkConnectionButton.disabled = false;
      saveButton.disabled = false;
      checkConnectionButton.textContent = originalLabel;
    }
  });

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;

    if (type === "success") {
      setTimeout(() => {
        messageDiv.className = "message";
      }, 3000);
    }
  }

  function hideMessage() {
    messageDiv.className = "message";
    messageDiv.textContent = "";
  }

  async function fetchBackendConnection(backendUrl, authToken) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const healthzUrl = buildHealthzUrl(backendUrl);
    const headers = {
      Accept: "application/json",
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    try {
      return await fetch(healthzUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("A conexão com o backend expirou após 5 segundos.");
      }

      throw new Error(
        `Não foi possível conectar ao backend em ${healthzUrl}: ${error.message}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function buildHealthzUrl(backendUrl) {
    return new URL("/healthz", ensureTrailingSlash(backendUrl)).toString();
  }

  function ensureTrailingSlash(value) {
    return value.endsWith("/") ? value : `${value}/`;
  }
});