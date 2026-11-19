// Same-origin authenticated parts avoid the function response-size limit.
(() => {
  const status = document.getElementById("download-status"),
    retry = document.getElementById("download-retry");
  async function download() {
    retry.hidden = true;
    try {
      const name = location.pathname.split("/").pop();
      if (!/^[-\w.]+$/.test(name)) throw Error("Invalid document");
      const response = await fetch(
        "/api/files/" + encodeURIComponent(name) + "/info",
        { credentials: "same-origin", cache: "no-store" },
      );
      const info = await response.json();
      if (!response.ok || !info.success)
        throw Error(info.message || "Sign in again to access this document.");
      const chunks = [];
      let received = 0;
      for (let index = 0; received < info.data.size; index++) {
        const part = await fetch(
          "/api/files/" + encodeURIComponent(name) + "/parts/" + index,
          { credentials: "same-origin", cache: "no-store" },
        );
        if (!part.ok)
          throw Error(
            "The document could not be downloaded. Sign in and retry.",
          );
        const bytes = await part.arrayBuffer();
        if (!bytes.byteLength) throw Error("A document part was empty.");
        chunks.push(bytes);
        received += bytes.byteLength;
        status.textContent =
          "Downloading document: " +
          Math.min(100, Math.round((received / info.data.size) * 100)) +
          "%";
      }
      if (received !== info.data.size)
        throw Error("The downloaded document size does not match.");
      const blob = new Blob(chunks, { type: info.data.contentType }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.textContent = "Save document";
      document.querySelector("main").append(link);
      link.click();
      status.textContent =
        "Document ready. If it did not save automatically, select Save document.";
      setTimeout(() => URL.revokeObjectURL(url), 600000);
    } catch (error) {
      status.textContent = error.message || "Unable to download document.";
      retry.hidden = false;
    }
  }
  retry.addEventListener("click", download);
  download();
})();
