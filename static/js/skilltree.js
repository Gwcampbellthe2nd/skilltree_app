let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);
let network = null;
let notes = '';

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
        color: { color: "#0288d1" }
    },
    layout: {
        hierarchical: { direction: "UD", sortMethod: "directed" }
    },
    manipulation: {
        enabled: false,
        addNode: (data, callback) => {
            data.label = prompt('Enter node label:', 'New Skill');
            if (data.label !== null) {
                data.size = 15; // Ensure consistent node size
                callback(data);
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

function initializeNetwork() {
    const container = document.getElementById('skilltree');
    const data = { nodes, edges };

    network = new vis.Network(container, data, options);

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

// Add default root node when creating a new tree
function addRootNode(treeName) {
    if (nodes.length === 0) {
        nodes.add({
            id: 1,
            label: '',
            title: treeName,
            size: 30, // Larger size for root node
            color: { background: "#FFD700", border: "#DAA520" },
            font: { size: 16, color: "#000" }
        });
    }
}

// Save graph and notes
function saveGraph() {
    const graphData = {
        nodes: nodes.get(),
        edges: edges.get(),
        notes: document.getElementById('notesTextarea').value
    };
    fetch(`/save/${treeName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphData)
    }).then(response => response.json())
      .then(data => alert(data.message || data.error));
}

// Load graph and notes
function loadGraph() {
    fetch(`/load/${treeName}`)
        .then(response => response.json())
        .then(data => {
            if (data.nodes && data.edges) {
                nodes = new vis.DataSet(data.nodes.map(node => ({
                    ...node,
                    size: node.id === 1 ? 30 : 15 // Root node size preserved
                })));
                edges = new vis.DataSet(data.edges);
                document.getElementById('notesTextarea').value = data.notes || '';
                initializeNetwork();
            }
        });
}

// Add a new node
function addNode() {
    network.addNodeMode();
}

// Add a new edge
function addEdge() {
    network.addEdgeMode();
}

// Delete selected nodes/edges
function deleteSelected() {
    network.deleteSelected();
}

initializeNetwork();
