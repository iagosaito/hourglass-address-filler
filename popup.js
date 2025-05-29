// Add a click event listener to the button with id "fillButton"
document.getElementById("fillButton").addEventListener("click", async () => {
  // Query the currently active tab in the current window
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject and execute a script in the context of the active tab
  chrome.scripting
    .executeScript({
      target: { tabId: tab.id }, // Specify the tab to run the script in

      // The function to execute in the page context
      func: (address) => {
        async function getLatLonFromAddress({
          street,
          number,
          neighborhood,
          city,
          state,
        }) {
          // Step 1: Build full address from available fields
          const parts = [street, number, neighborhood, city, state].filter(
            Boolean
          ); // Remove undefined/null/empty

          const fullAddress = parts.join(", ");

          // Step 2: Encode the address for use in a URL
          const encodedAddress = encodeURIComponent(fullAddress);

          // Step 3: Fetch from Nominatim
          const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json`;

          try {
            const response = await fetch(url, {
              headers: {
                "User-Agent": "hourglass-auto-fill-extension", // required by Nominatim
                "Accept-Language": "pt-BR", // optional: favor Portuguese results
              },
            });

            const data = await response.json();

            if (data.length === 0) {
              throw new Error("No results found for address");
            }

            // Return the first result's lat/lon
            const { lat, lon } = data[0];
            return { lat, lon };
          } catch (err) {
            console.error("[Geocoding Error]", err);
            return null;
          }
        }

        // Helper to remove accents from strings for easier comparison
        function toAscii(str) {
          return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        // Helper to set the value of a React-controlled input and dispatch an input event
        function dispatchInputEvent(input, value) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          ).set;
          nativeInputValueSetter.call(input, value);

          const event = new Event("input", { bubbles: true });
          input.dispatchEvent(event);
        }

        function dispatchSelectEvenet(select, newValue) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLSelectElement.prototype,
            "value"
          ).set;
          nativeSetter.call(select, newValue);

          const changeEvent = new Event("change", { bubbles: true });

          select.dispatchEvent(changeEvent);
        }

        // Fill form fields by matching their labels to address data
        function fillByLabel(data) {
          // Map label text to address data fields
          const mapping = {
            Endereco: `${data.street}, ${data.number}`,
            Bairro: data.neighborhood,
            Cidade: data.city,
            Estado: data.state,
            CEP: data.cep,
            Latitude: data.latitude,
            Longitude: data.longitude,
          };

          // For each label, find the corresponding input and fill it
          for (const [label, value] of Object.entries(mapping)) {
            const input = findInputByLabelText(label);
            if (input) dispatchInputEvent(input, value);
          }

          // Special handling for the state field (select element)
          const select = document.getElementById("state");
          dispatchSelectEvenet(select, mapping.Estado);
        }

        // Find an input field by its associated label text
        function findInputByLabelText(labelText) {
          const labels = [...document.querySelectorAll("label")];

          for (const label of labels) {
            // Compare label text (ignoring accents and case)
            if (
              toAscii(label.textContent).trim().toLowerCase() ===
              labelText.toLowerCase()
            ) {
              // Assume the input is a child of the label's parent
              return label.parentElement.querySelector("input");
            }
          }
          return null; // Return null if not found
        }

        // Regex to parse the address string into components
        const regex =
          /(.+?),\s*(\d+)\s*-\s*(.+?),\s*(.+?)\s*-\s*(\w{2}),\s*(\d{5}-\d{3})/;
        const match = address.match(regex); // Match the address string

        if (!match) return; // If address doesn't match the pattern, exit

        // Map regex groups to field names
        const fields = {
          street: match[1],
          number: match[2],
          neighborhood: match[3],
          city: match[4],
          state: match[5],
          cep: match[6],
        };

        getLatLonFromAddress(fields) // Get latitude and longitude from the address
          .then((latLon) => {
            if (latLon) {
              fields.latitude = Number(latLon.lat); // Add latitude to fields
              fields.longitude = Number(latLon.lon); // Add longitude to fields
            }

            fillByLabel(fields);
          })
          .catch((err) => console.error("[Geocoding Error]", err));
      },

      // Pass the value from the address input field as an argument to the function
      args: [document.getElementById("addressInput").value],
    })
    .then(() => console.log("script injected")); // Log when the script is injected
});
