// helpers -------------------------------------------------------
const fileInput  = document.getElementById("fileInput");
const fileNameEl = document.getElementById("fileName");
const predictBtn = document.getElementById("predictBtn");
const previewCv  = document.getElementById("preview");
const resultEl   = document.getElementById("result");
let chart;

// draw preview on canvas
function drawPreview(file) {
  const ctx = previewCv.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0,0,previewCv.width,previewCv.height);
    ctx.drawImage(img, 0, 0, previewCv.width, previewCv.height);
  };
  img.src = URL.createObjectURL(file);
}

// bar‑plot of probabilities
function updateChart(probs) {
  if (chart) chart.destroy();
  chart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: [...Array(10).keys()],
      datasets: [{
        data: probs,
        label: "Probability",
      }]
    },
    options: { scales:{ y:{ beginAtZero:true, max:1 } } }
  });
}

// ----------------------------------------------------------------
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("❌ File is not an image!");
    fileInput.value = "";
    predictBtn.disabled = true;
    return;
  }
  fileNameEl.textContent = file.name;
  predictBtn.disabled = false;
  drawPreview(file);
});

predictBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);

  resultEl.textContent = "Predicting…";
  const res = await fetch("/predict", { method: "POST", body: fd });
  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Server error");
    resultEl.textContent = "";
    return;
  }

  resultEl.textContent = `Digit: ${data.digit}  (conf. ${data.confidence}%)`;
  updateChart(data.probs);
});

// ----------------------------------------------------------------
// sample digits
// --------------------------------------------------------------
//  Dynamically build thumbnails from whatever files exist
// --------------------------------------------------------------
async function loadSamples() {
  const samplesDiv = document.getElementById("samples");

  // Fetch the manifest from Flask
  const manifest = await fetch("/samples").then(r => r.json());

  // Loop over the 10 digit folders
  for (let digit = 0; digit < 10; digit++) {
    const files = manifest[digit];          // e.g. ["2.png", "5.png"]
    if (!files || files.length === 0) continue;   // skip empty folders

    // pick a random file from those that exist
    const rndFile = files[Math.floor(Math.random() * files.length)];
    const imgPath = `/static/samples/${digit}/${rndFile}`;

    // thumbnail element
    const img = new Image();
    img.src = imgPath;
    img.width = 56;
    img.height = 56;
    img.style.cursor = "pointer";

    // click‑to‑predict logic (unchanged)
    img.onclick = async () => {
      const blob = await (await fetch(img.src)).blob();
      const file = new File([blob], rndFile, { type: "image/png" });

      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event("change"));

      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/predict", { method: "POST", body: fd });
      const data = await res.json();
      resultEl.textContent =
        `Digit: ${data.digit}  (conf. ${data.confidence}%)`;
      updateChart(data.probs);
    };

    samplesDiv.appendChild(img);
  }
}
loadSamples();   // call it once on page load
