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
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Workflow, WorkflowNode, WorkflowEdge } from '@/lib/types';
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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>(workflow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>(workflow?.edges || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');

  useEffect(() => {
    if (workflow) {
      setNodes(workflow.nodes || []);
      setEdges(workflow.edges || []);
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

  // Add a new node of a specific type
  const addNode = (type: 'task' | 'decision' | 'subprocess') => {
    const nodeCount = nodes.filter(n => n.type === type).length;
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 100, y: 100 + nodeCount * 50 }, // Position new nodes with an offset
      data: { 
        label: `New ${type}`,
        description: type === 'decision' ? 'Yes/No' : '' 
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
      const workflowData = {
        name,
        description,
        nodes,
        edges,
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
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
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
      <div className="flex-1 h-0 relative">
        <style>{customNodeStyles}</style>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={!readOnly ? onNodesChange : undefined}
          onEdgesChange={!readOnly ? onEdgesChange : undefined}
          onConnect={!readOnly ? onConnect : undefined}
          onEdgeUpdate={!readOnly ? onEdgeUpdate : undefined}
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
        >
          <Controls />
          <Background gap={12} size={1} />

          {!readOnly && (
            <Panel position="top-left" className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addNode('task')}
                  className="w-full justify-start"
                >
                  <Plus className="h-4 w-4 mr-1" /> Task
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addNode('decision')}
                  className="w-full justify-start"
                >
                  <Plus className="h-4 w-4 mr-1" /> Decision
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addNode('subprocess')}
                  className="w-full justify-start"
                >
                  <Plus className="h-4 w-4 mr-1" /> Subprocess
                </Button>
              </div>
            </Panel>
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