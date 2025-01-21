let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);
let network = null;
let nodeToRename = null; // Store the node being renamed

// Object to store notes for each node
let nodeNotes = {};

const options = {
    nodes: {
        shape: "circle",
        size: 15, // Default size for all nodes
        font: { size: 14, color: "#333" },
        color: { background: "#b3e5fc", border: "#0288d1" },
        labelAlignment: 'below'
    },
    edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        smooth: { type: 'cubicBezier' },
        color: { color: "#0288d1" },
        width: 1
    },
    layout: {
        hierarchical: {
            direction: "DU", // Reverse the flow to stack upwards
            sortMethod: "directed"
        }
    },
    manipulation: {
        enabled: false,
        addNode: (data, callback) => {
            const newNodeId = `node-${Date.now()}`; // Generate a unique ID for the new node
            nodes.add({ id: newNodeId, label: 'New Node', color: { background: '#b3e5fc' }, size: 15 }); // Add a placeholder node
            openRenameModal(newNodeId); // Immediately open the rename modal
        },
        addEdge: (data, callback) => {
            if (data.from === data.to) {
                showAlert('Cannot connect a node to itself.');
                return;
            }
            callback(data);
        },
        deleteNode: true,
        deleteEdge: true,
    }
};

/**
 * Initialize the Vis.js network graph.
 */
function initializeNetwork() {
    const container = document.getElementById('skilltree');
    const data = { nodes, edges };

    // Initialize the network
    network = new vis.Network(container, data, options);

    // Trigger a redraw after stabilization
    network.once('stabilized', () => {
        network.fit(); // Adjust the view to fit all nodes
    });

    // Ensure resizing works on window resize
    window.addEventListener('resize', () => {
        network.redraw();
    });

    // Handle node selection and other events (as before)
    network.on("selectNode", (params) => {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            updateNotesSection(nodeId);
        }
    });

    network.on("deselectNode", () => {
        clearNotesSection();
    });

    network.on("doubleClick", (params) => {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            openRenameModal(nodeId);
        }
    });
}


/**
 * Update the notes section for a specific node.
 */
function updateNotesSection(nodeId) {
    const notesTextarea = document.getElementById('notesTextarea');
    const node = nodes.get(nodeId); // Fetch the node details using the ID
    const nodeLabel = node.label || `Node ${nodeId}`; // Use label or fallback to ID

    // Populate the notes for the selected node
    notesTextarea.value = nodeNotes[nodeId] || "";
    notesTextarea.dataset.currentNode = nodeId; // Track the current node ID
    document.getElementById('notesHeader').innerText = `Notes for: ${nodeLabel}`;

    // Enable the "Complete" and "Not Complete" buttons
    document.getElementById('markCompleteButton').disabled = false;
    document.getElementById('markNotCompleteButton').disabled = false;

    // Add input event listener to save notes as the user types
    notesTextarea.oninput = () => {
        nodeNotes[nodeId] = notesTextarea.value;
    };
}

/**
 * Clear the notes section when no node is selected.
 */
function clearNotesSection() {
    const notesTextarea = document.getElementById('notesTextarea');
    notesTextarea.value = "";
    delete notesTextarea.dataset.currentNode;
    document.getElementById('notesHeader').innerText = "Select a Node to View Notes";

    // Disable the "Complete" and "Not Complete" buttons
    document.getElementById('markCompleteButton').disabled = true;
    document.getElementById('markNotCompleteButton').disabled = true;

    // Remove the input event listener
    notesTextarea.oninput = null;
}

/**
 * Mark the selected node as "Complete" (turns green).
 */
function markNodeComplete() {
    const selectedNodes = network.getSelectedNodes();

    if (selectedNodes.length > 0) {
        const nodeId = selectedNodes[0];
        nodes.update({ id: nodeId, color: { background: "#4caf50", border: "#38823b" }, font: { color: "#fff" } }); // Green
        updateEdges(); // Update edges after marking node as complete
    } else {
        showAlert("No node selected! Please select a node to mark as complete.");
    }
}

/**
 * Mark the selected node as "Not Complete" (turns blue).
 */
function markNodeNotComplete() {
    const selectedNodes = network.getSelectedNodes();

    if (selectedNodes.length > 0) {
        const nodeId = selectedNodes[0];
        nodes.update({ id: nodeId, color: { background: "#b3e5fc" } }); // Blue
        updateEdges(); // Update edges after marking node as not complete
    } else {
        showAlert("No node selected! Please select a node to mark as not complete.");
    }
}

/**
 * Update the style of edges based on the completion status of connected nodes.
 */
function updateEdges() {
    edges.forEach((edge) => {
        const fromNode = nodes.get(edge.from);
        const toNode = nodes.get(edge.to);

        // Check if both nodes are green (complete)
        if (fromNode.color.background === "#4caf50" && toNode.color.background === "#4caf50") {
            edges.update({
                id: edge.id,
                color: { color: "#4caf50" }, // Green
                width: 3 // Bold
            });
        } else {
            edges.update({
                id: edge.id,
                color: { color: "#0288d1" }, // Default blue
                width: 1 // Default width
            });
        }
    });
}

/**
 * Save the current graph (nodes and edges) to the server.
 */
function saveGraph() {
    const treeName = decodeURIComponent(window.location.pathname.split('/').pop());
    if (!treeName) {
        showAlert("No tree name found in the URL. Unable to save the skill tree.");
        return;
    }

    const graphData = {
        nodes: nodes.get(), // Get all nodes
        edges: edges.get(), // Get all edges
        notes: nodeNotes, // Include notes for nodes
    };

    fetch(`/save/${encodeURIComponent(treeName)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphData),
    })
        .then((response) => {
            if (response.ok) {
            } else {
                showAlert(`Failed to save skill tree '${treeName}'.`);
            }
        })
        .catch((error) => {
            console.error('Error saving skill tree:', error);
            showAlert('An error occurred while saving the skill tree.');
        });
}

/**
 * Load the graph for the current skill tree.
 */
function loadGraph() {
    fetch(`/load/${encodeURIComponent(treeName)}`)
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                console.warn(`No saved graph found for '${treeName}'.`);
                return null;
            }
        })
        .then((data) => {
            if (data) {
                // Populate nodes, edges, and notes from the fetched data
                nodes.add(data.nodes);
                edges.add(data.edges);
                nodeNotes = data.notes || {};
            }
        })
        .catch((error) => {
            console.error('Error loading graph:', error);
        });
}

/**
 * Save the graph as an image with the graph name as the file name.
 */
function savePhoto() {
    // Get the graph name from the URL or a predefined variable
    const graphName = decodeURIComponent(window.location.pathname.split('/').pop());

    // Get the canvas element from the Vis.js network container
    const canvas = document.querySelector("canvas");

    if (!canvas) {
        showAlert("No canvas found to save!");
        return;
    }

    // Convert the canvas to a data URL (base64 image format)
    const image = canvas.toDataURL("image/png");

    // Create a download link
    const link = document.createElement("a");
    link.href = image;
    link.download = `${graphName || "skill-tree"}.png`; // Use the graph name or default to "skill-tree.png"
    link.click();
}




/**
 * Open the rename modal for the selected or new node.
 * @param {string} nodeId - The ID of the node to rename.
 */
function openRenameModal(nodeId) {
    const renameModal = document.getElementById('renameModal');
    const renameInput = document.getElementById('renameInput');
    const node = nodes.get(nodeId);

    if (!node) {
        console.error('Node not found for renaming.');
        return;
    }

    nodeToRename = nodeId; // Store the node ID for renaming
    renameInput.value = node.label || ''; // Pre-fill with the current label, if any
    renameModal.style.display = 'flex'; // Show the modal
}

/**
 * Confirm the renaming of the node.
 */
function confirmRename() {
    const renameModal = document.getElementById('renameModal');
    const renameInput = document.getElementById('renameInput');
    const newLabel = renameInput.value.trim();

    if (!newLabel) {
        showAlert('Node name cannot be empty!');
        return;
    }

    // Update the node label
    if (nodeToRename !== null) {
        nodes.update({ id: nodeToRename, label: newLabel });
        nodeToRename = null; // Clear the stored node ID
    }

    renameModal.style.display = 'none'; // Hide the modal
}

/**
 * Close the rename modal without making changes.
 */
function closeRenameModal() {
    const renameModal = document.getElementById('renameModal');
    renameModal.style.display = 'none'; // Hide the modal
    nodeToRename = null; // Clear the stored node ID
}

/**
 * Add a new node to the graph.
 */
function addNode() {
    const newNodeId = `node-${Date.now()}`; // Generate a unique ID for the new node
    nodes.add({ id: newNodeId, label: 'New Node', color: { background: '#b3e5fc' }, size: 15 }); // Add a placeholder node
    openRenameModal(newNodeId); // Immediately open the rename modal
}

/**
 * Add a new edge between nodes.
 */
function addEdge() {
    network.addEdgeMode();
}

/**
 * Delete selected nodes or edges from the graph.
 */
function deleteSelected() {
    network.deleteSelected();
}

/**
 * Show a custom alert message.
 * @param {string} message - The message to display.
 */
function showAlert(message) {
    if (!message || message.trim() === '') {
        console.warn('showAlert called with an empty or undefined message.');
        return; // Do nothing if the message is empty or undefined
    }

    const modal = document.getElementById('customAlert');
    const alertMessage = document.getElementById('alertMessage');

    if (!modal || !alertMessage) {
        console.error('Custom alert modal or alert message element not found.');
        return;
    }

    alertMessage.innerText = message;
    modal.style.display = 'flex'; // Show the modal
}

/**
 * Close the custom alert modal.
 */
function closeAlert() {
    const modal = document.getElementById('customAlert');
    if (modal) {
        modal.style.display = 'none'; // Hide the modal
    }
}

// Initialize the graph
initializeNetwork();
