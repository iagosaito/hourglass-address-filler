import { parseGoogleMapsAddress } from "../shared/address.js";
import { getLatLonFromAddress } from "../content/geocoding.js";

function fillPageForm(hydratedFields) {
  function toAscii(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function dispatchInputEvent(input, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    nativeInputValueSetter.call(input, value == null ? "" : String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function dispatchSelectEvent(select, value) {
    if (!select) return;
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      "value"
    ).set;
    nativeSetter.call(select, value == null ? "" : String(value));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findInputByLabelText(labelText) {
    const labels = [...document.querySelectorAll("label")];
    for (const label of labels) {
      if (
        toAscii(label.textContent).trim().toLowerCase() ===
        labelText.toLowerCase()
      ) {
        return label.parentElement?.querySelector("input") || null;
      }
    }
    return null;
  }

  const mapping = {
    Endereco: `${hydratedFields.street}, ${hydratedFields.number}`,
    Bairro: hydratedFields.neighborhood,
    Cidade: hydratedFields.city,
    Estado: hydratedFields.state,
    CEP: hydratedFields.cep,
    Latitude: hydratedFields.latitude,
    Longitude: hydratedFields.longitude,
  };

  for (const [label, value] of Object.entries(mapping)) {
    const input = findInputByLabelText(label);
    if (input) {
      dispatchInputEvent(input, value);
    }
  }

  const stateSelect = document.getElementById("state");
  dispatchSelectEvent(stateSelect, mapping.Estado);
}

function setupPopup() {
  const addressInput = document.getElementById("addressInput");
  const fillButton = document.getElementById("fillButton");

  if (!addressInput || !fillButton) {
    console.error("[Popup Error] Missing popup elements.");
    return;
  }

  fillButton.addEventListener("click", async () => {
    const parsedFields = parseGoogleMapsAddress(addressInput.value);

    if (!parsedFields) {
      console.error("[Parse Error] Address does not match expected format.");
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      console.error("[Popup Error] Could not resolve active tab.");
      return;
    }

    const latLon = await getLatLonFromAddress(parsedFields);
    const hydratedFields = {
      ...parsedFields,
      latitude: latLon ? latLon.lat : null,
      longitude: latLon ? latLon.lon : null,
    };

    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        func: fillPageForm,
        args: [hydratedFields],
      })
      .then(() => console.log("[Popup] Form filled"))
      .catch((err) => console.error("[Popup] executeScript error:", err));
  });
}

setupPopup();
