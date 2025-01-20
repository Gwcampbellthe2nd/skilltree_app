let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);
let network = null;

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
        arrows: { to: { enabled: false, scaleFactor: 0.5 } },
        smooth: { type: 'discrete' },
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
            data.label = prompt('Enter node label:', 'New Skill');
            if (data.label !== null) {
                data.size = 15; // Ensure consistent node size
                callback(data);
                nodeNotes[data.id] = ""; // Initialize empty notes for the new node
            }
        },
        addEdge: (data, callback) => {
            if (data.from === data.to) {
                alert('Cannot connect a node to itself.');
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

    network = new vis.Network(container, data, options);

    // Handle node selection to display its notes
    network.on("selectNode", (params) => {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            updateNotesSection(nodeId);
        }
    });

    // Clear notes if no node is selected
    network.on("deselectNode", () => {
        clearNotesSection();
    });

    // Handle node double-click to edit label and initialize notes if missing
    network.on("doubleClick", (params) => {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodes.get(nodeId);
            const newLabel = prompt('Edit node label:', node.label);
            if (newLabel !== null && newLabel.trim() !== '') {
                nodes.update({ id: nodeId, label: newLabel });
            }
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
        nodes.update({ id: nodeId, color: { background: "#4caf50" } }); // Green
        updateEdges(); // Update edges after marking node as complete
    } else {
        alert("No node selected! Please select a node to mark as complete.");
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
        alert("No node selected! Please select a node to mark as not complete.");
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
 * Extract the tree name from the URL path.
 */
function getTreeNameFromURL() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1]; // The last part of the URL is the tree name
}

/**
 * Save the current graph (nodes and edges) to the server.
 */
function saveGraph() {
    const treeName = getTreeNameFromURL();
    if (!treeName) {
        alert('No tree name found in the URL. Unable to save the skill tree.');
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
                alert(`Skill tree '${treeName}' saved successfully!`);
            } else {
                alert(`Failed to save skill tree '${treeName}'.`);
            }
        })
        .catch((error) => {
            console.error('Error saving skill tree:', error);
            alert('An error occurred while saving the skill tree.');
        });
}



/**
 * Add a new node to the graph.
 */
function addNode() {
    network.addNodeMode();
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

// Initialize the graph
initializeNetwork();
