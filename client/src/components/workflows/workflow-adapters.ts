/**
 * Adapters to convert between ReactFlow Node/Edge types and our Workflow types
 */
import { Node, Edge, MarkerType } from 'reactflow';
import { WorkflowNode, WorkflowEdge } from '@shared/types';

/**
 * Convert WorkflowNode array to ReactFlow Node array
 * @param workflowNodes The workflow nodes to convert
 * @returns ReactFlow compatible nodes
 */
export function workflowNodesToReactFlowNodes(workflowNodes: WorkflowNode[] = []): Node[] {
  return workflowNodes.map(node => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data || { label: 'Unknown' },
    // Add any other ReactFlow node properties with defaults
    draggable: true,
    selectable: true,
    connectable: true,
  }));
}

/**
 * Convert ReactFlow Node array to WorkflowNode array
 * @param reactFlowNodes The ReactFlow nodes to convert
 * @returns Workflow compatible nodes
 */
export function reactFlowNodesToWorkflowNodes(reactFlowNodes: Node[] = []): WorkflowNode[] {
  return reactFlowNodes.map(node => ({
    id: node.id,
    type: node.type as 'task' | 'userTask' | 'decision' | 'start' | 'end' | 'subprocess' | 'parallel' | 'wait' | 'message' | 'error' | 'annotation',
    position: node.position,
    data: {
      label: node.data?.label || 'Unnamed',
      description: node.data?.description,
      requirementId: node.data?.requirementId,
      taskId: node.data?.taskId,
      properties: node.data?.properties,
    },
  }));
}

/**
 * Convert WorkflowEdge array to ReactFlow Edge array
 * @param workflowEdges The workflow edges to convert
 * @returns ReactFlow compatible edges
 */
export function workflowEdgesToReactFlowEdges(workflowEdges: WorkflowEdge[] = []): Edge[] {
  return workflowEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: edge.type,
    animated: edge.animated,
    style: edge.style,
    data: edge.data,
    // Add any other ReactFlow edge properties with defaults
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  }));
}

/**
 * Convert ReactFlow Edge array to WorkflowEdge array
 * @param reactFlowEdges The ReactFlow edges to convert
 * @returns Workflow compatible edges
 */
export function reactFlowEdgesToWorkflowEdges(reactFlowEdges: Edge[] = []): WorkflowEdge[] {
  return reactFlowEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label ? String(edge.label) : undefined,
    type: edge.type as 'default' | 'conditional' | 'exception' | 'message' | 'annotation' | 'timeout' | undefined,
    animated: edge.animated,
    style: edge.style,
    data: edge.data,
  }));
}