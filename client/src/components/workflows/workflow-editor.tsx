import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  Connection,
  useNodesState,
  useEdgesState,
  Panel,
  addEdge,
  updateEdge,
  MarkerType,
  OnSelectionChangeParams
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Workflow } from '@/lib/types';
import { WorkflowNode, WorkflowEdge } from '@shared/types';
import { nodeTypes, customNodeStyles } from './workflow-nodes';
import { 
  workflowNodesToReactFlowNodes, 
  workflowEdgesToReactFlowEdges,
  reactFlowNodesToWorkflowNodes,
  reactFlowEdgesToWorkflowEdges
} from './workflow-adapters';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WorkflowEditorProps {
  projectId: number;
  workflow?: Workflow;
  onSaved?: (workflow: Workflow) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function WorkflowEditor({ 
  projectId, 
  workflow, 
  onSaved, 
  onCancel,
  readOnly = false 
}: WorkflowEditorProps) {
  const { toast } = useToast();
  // Convert workflow nodes and edges to ReactFlow compatible types
  const initialNodes = workflow?.nodes ? workflowNodesToReactFlowNodes(workflow.nodes) : [];
  const initialEdges = workflow?.edges ? workflowEdgesToReactFlowEdges(workflow.edges) : [];
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>(initialEdges);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    if (workflow) {
      // Use the adapter functions to convert types
      setNodes(workflowNodesToReactFlowNodes(workflow.nodes || []));
      setEdges(workflowEdgesToReactFlowEdges(workflow.edges || []));
      setName(workflow.name);
      setDescription(workflow.description || '');
    }
  }, [workflow, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Create edge with markers for a nicer look
      const newEdge = {
        ...params,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => updateEdge(oldEdge, newConnection, els));
    },
    [setEdges]
  );

  // Handle node selection
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      // When a node is selected, update the selectedNode state
      // We only allow editing one node at a time, so we use the first selected node
      if (selectedNodes.length === 1) {
        setSelectedNode(selectedNodes[0]);
      } else {
        setSelectedNode(null);
      }
    },
    []
  );

  // Update the properties of a node
  const updateNodeProperties = useCallback(
    (nodeId: string, properties: { label?: string; description?: string }) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            // Create a new node object with updated data
            return {
              ...node,
              data: {
                ...node.data,
                ...properties
              }
            };
          }
          return node;
        })
      );
      
      // Update the selected node state if it matches the updated node
      if (selectedNode?.id === nodeId) {
        setSelectedNode((currentSelected) => {
          if (!currentSelected) return null;
          return {
            ...currentSelected,
            data: {
              ...currentSelected.data,
              ...properties
            }
          };
        });
      }
    },
    [setNodes, selectedNode]
  );

  // Add a new node of a specific type
  const addNode = (type: 'start' | 'end' | 'task' | 'userTask' | 'decision' | 'subprocess' | 'parallel' | 'wait' | 'message' | 'error' | 'annotation') => {
    const nodeCount = nodes.filter(n => n.type === type).length;
    
    // Set default label and descriptions based on node type
    let label = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    let description = '';
    
    switch(type) {
      case 'start':
        label = 'Start';
        description = 'Start of process';
        break;
      case 'end':
        label = 'End';
        description = 'End of process';
        break;
      case 'task':
        label = 'Task';
        description = 'System task';
        break;
      case 'userTask':
        label = 'User Task';
        description = 'Requires user input';
        break;
      case 'decision':
        label = 'Decision';
        description = 'Yes/No';
        break;
      case 'subprocess':
        label = 'Subprocess';
        description = 'Nested process';
        break;
      case 'parallel':
        label = 'Parallel Gateway';
        description = 'Split flow';
        break;
      case 'wait':
        label = 'Wait';
        description = 'Time delay';
        break;
      case 'message':
        label = 'Message';
        description = 'Send/receive';
        break;
      case 'error':
        label = 'Error';
        description = 'Handle errors';
        break;
      case 'annotation':
        label = 'Note';
        description = 'Annotation';
        break;
    }
    
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { 
        x: 100 + (nodeCount % 3) * 50, 
        y: 100 + nodeCount * 50 
      },
      data: { 
        label,
        description
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Delete selected nodes and their connected edges
  const deleteSelection = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => {
      const sourceNodeSelected = nodes.find(n => n.id === edge.source)?.selected;
      const targetNodeSelected = nodes.find(n => n.id === edge.target)?.selected;
      return !edge.selected && !sourceNodeSelected && !targetNodeSelected;
    }));
  }, [nodes, setNodes, setEdges]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || (event.key === 'Backspace' && (event.metaKey || event.ctrlKey))) {
        deleteSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteSelection]);

  const saveWorkflow = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Workflow name is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Convert ReactFlow nodes and edges back to our workflow types
      const workflowNodes = reactFlowNodesToWorkflowNodes(nodes);
      const workflowEdges = reactFlowEdgesToWorkflowEdges(edges);
      
      const workflowData = {
        name,
        description,
        nodes: workflowNodes,
        edges: workflowEdges,
        status: 'draft',
        projectId,
        version: workflow?.version ? workflow.version + 1 : 1
      };

      let response;
      if (workflow?.id) {
        // Update existing
        response = await apiRequest<Workflow>(`/api/workflows/${workflow.id}`, {
          method: 'PUT',
          data: workflowData
        });
      } else {
        // Create new
        response = await apiRequest<Workflow>(`/api/projects/${projectId}/workflows`, {
          method: 'POST',
          data: workflowData
        });
      }

      if (response) {
        toast({
          title: "Success",
          description: `Workflow ${workflow?.id ? 'updated' : 'created'} successfully`,
        });
        if (onSaved) onSaved(response);
      }
    } catch (err) {
      console.error('Error saving workflow:', err);
      setError('Failed to save workflow. Please try again.');
      toast({
        title: "Error",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700" style={{ height: '800px', width: '100%' }}>
      {/* Editor header with controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-2">
        <div className="flex-1 min-w-[250px]">
          <input
            type="text"
            placeholder="Workflow Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
            disabled={readOnly}
          />
          <input
            type="text"
            placeholder="Workflow Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full mt-2 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-sm text-gray-500 dark:text-gray-400 focus:ring-2 focus:ring-primary focus:outline-none"
            disabled={readOnly}
          />
        </div>
        
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelection}
                disabled={!nodes.some((n) => n.selected) && !edges.some((e) => e.selected)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={saveWorkflow}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save Workflow
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 relative" style={{ height: 'calc(100% - 110px)', minHeight: '500px' }}>
        <style>{customNodeStyles}</style>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={!readOnly ? onNodesChange : undefined}
          onEdgesChange={!readOnly ? onEdgesChange : undefined}
          onConnect={!readOnly ? onConnect : undefined}
          onEdgeUpdate={!readOnly ? onEdgeUpdate : undefined}
          onSelectionChange={!readOnly ? onSelectionChange : undefined}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={null} // Disable default delete to handle it ourselves
          minZoom={0.2}
          maxZoom={4}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          edgesFocusable={!readOnly}
          nodesFocusable={!readOnly}
          style={{ width: '100%', height: '100%', background: '#f8f9fa' }}
        >
          <Controls />
          <Background gap={12} size={1} />

          {!readOnly && (
            <>
              {/* Node Editor Panel - visible when a node is selected */}
              {selectedNode && (
                <Panel position="top-right" className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-md border border-gray-200 dark:border-gray-700 w-64">
                  <div className="text-xs font-semibold mb-2 text-gray-600 dark:text-gray-300">EDIT NODE</div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Node Name
                      </label>
                      <input
                        type="text"
                        value={selectedNode.data?.label || ''}
                        onChange={(e) => updateNodeProperties(selectedNode.id, { label: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={selectedNode.data?.description || ''}
                        onChange={(e) => updateNodeProperties(selectedNode.id, { description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                      />
                    </div>
                    {selectedNode.type && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Type: <span className="font-medium capitalize">{selectedNode.type}</span>
                      </div>
                    )}
                  </div>
                </Panel>
              )}

              {/* Add Node Panel */}
              <Panel position="top-left" className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold mb-2 text-gray-600 dark:text-gray-300">ADD NODE</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('start')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div> Start
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('end')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div> End
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('task')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 rounded bg-blue-500 mr-1"></div> Task
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('userTask')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 rounded bg-blue-300 mr-1"></div> User Task
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('decision')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 transform rotate-45 bg-yellow-400 mr-1"></div> Decision
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('subprocess')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 rounded bg-indigo-500 mr-1"></div> Subprocess
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('parallel')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 transform rotate-45 bg-purple-500 mr-1"></div> Parallel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('wait')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div> Wait
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('message')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 rounded-full bg-teal-500 mr-1"></div> Message
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('error')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div> Error
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addNode('annotation')}
                    className="justify-start h-8"
                  >
                    <div className="w-3 h-3 border border-gray-400 mr-1"></div> Note
                  </Button>
                </div>
              </Panel>
            </>
          )}
        </ReactFlow>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
