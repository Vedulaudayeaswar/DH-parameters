async function loadPyodideAndPackages() {
    try {
        const pyodide = await loadPyodide();
        await pyodide.loadPackage("numpy");
        return pyodide;
    } catch (error) {
        console.error("Failed to load Pyodide or packages:", error);
        document.getElementById("output").innerText = "Error loading Pyodide. Please try again.";
    }
}

let pyodideReadyPromise = loadPyodideAndPackages();

function generateInputs() {
    const numLinks = document.getElementById("num_links").value;
    const linkParametersDiv = document.getElementById("link-parameters");
    linkParametersDiv.innerHTML = ""; 

    for (let i = 0; i < numLinks; i++) {
        linkParametersDiv.innerHTML += `
            <h3>Link ${i + 1}</h3>
            <label for="a_${i}">Offset (a):</label>
            <input type="number" id="a_${i}" value="0" step="0.1">
            <label for="d_${i}">Link Length (d):</label>
            <input type="number" id="d_${i}" value="0" step="0.1">
            <label for="theta1_${i}">Rotational Angle (θ1):</label>
            <input type="number" id="theta1_${i}" value="0" step="0.1">
            <label for="theta2_${i}">Twist Angle (θ2):</label>
            <input type="number" id="theta2_${i}" value="0" step="0.1">
        `;
    }
}

async function runPythonCode() {
    const pyodide = await pyodideReadyPromise;
    
    if (!pyodide) {
        document.getElementById("output").innerText = "Pyodide not loaded. Please refresh the page.";
        return;
    }

    let numLinks = parseInt(document.getElementById("num_links").value);
    let linkParams = [];
    
    for (let i = 0; i < numLinks; i++) {
        const a = parseFloat(document.getElementById(`a_${i}`).value);
        const d = parseFloat(document.getElementById(`d_${i}`).value);
        const theta1 = parseFloat(document.getElementById(`theta1_${i}`).value);
        const theta2 = parseFloat(document.getElementById(`theta2_${i}`).value);
        linkParams.push([a, d, theta1, theta2]);
    }

    const pythonCode = `
import numpy as np

def transformation_matrix(a, d, t1, t2):
    t1r = np.radians(t1)
    t2r = np.radians(t2)
    return np.array([[np.cos(t1r), -np.sin(t1r) * np.cos(t2r), np.sin(t1r) * np.sin(t2r), a * np.cos(t1r)],
                     [np.sin(t1r), np.cos(t1r) * np.cos(t2r), -np.cos(t1r) * np.sin(t2r), a * np.sin(t1r)],
                     [0, np.sin(t2r), np.cos(t2r), d],
                     [0, 0, 0, 1]])

link_matrix = []
link_params = ${JSON.stringify(linkParams)};

for params in link_params:
    a, d, t1, t2 = params
    link_matrix.append(transformation_matrix(a, d, t1, t2))

if len(link_matrix) > 1:
    result = np.linalg.multi_dot(link_matrix)
elif len(link_matrix) == 0:
    result = 'No transformation matrices found. Please provide valid inputs.'
else:
    result = link_matrix[0]

result
`;

    try {
        const result = await pyodide.runPython(pythonCode);
        document.getElementById("output").innerText = `Final Transformation Matrix:\n${result}`;
    } catch (error) {
        document.getElementById("output").innerText = `Error executing code: ${error.message}`;
    }
}
