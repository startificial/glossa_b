import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Start node
export function StartNode({ data }: NodeProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-md p-2 border border-gray-300 dark:border-gray-600 min-w-[120px] text-center">
      <div className="font-semibold text-green-600 dark:text-green-400">Start</div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="out" 
        className="w-3 h-3 bg-green-500" 
      />
    </div>
  );
}

// End node
export function EndNode({ data }: NodeProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-md p-2 border border-gray-300 dark:border-gray-600 min-w-[120px] text-center">
      <Handle 
        type="target" 
        position={Position.Top} 
        id="in" 
        className="w-3 h-3 bg-red-500" 
      />
      <div className="font-semibold text-red-600 dark:text-red-400">End</div>
    </div>
  );
}

// Task node
export function TaskNode({ data }: NodeProps) {
  return (
    <Card className="w-60 shadow-md min-h-[90px] bg-white dark:bg-gray-800">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
        {data.requirementId && (
          <Badge variant="outline" className="text-xs">REQ-{data.requirementId}</Badge>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <CardDescription className="text-xs line-clamp-2">
          {data.description || 'No description provided'}
        </CardDescription>
      </CardContent>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="in" 
        className="w-3 h-3 bg-blue-500" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="out" 
        className="w-3 h-3 bg-blue-500" 
      />
    </Card>
  );
}

// Decision node
export function DecisionNode({ data }: NodeProps) {
  return (
    <div className="diamond-node bg-white dark:bg-gray-800 shadow-md border border-gray-300 dark:border-gray-600 w-[140px] h-[80px] flex items-center justify-center transform rotate-45">
      <div className="transform -rotate-45 text-center w-full p-2">
        <div className="font-medium text-sm">{data.label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
          {data.description || 'Decision point'}
        </div>
      </div>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="in" 
        className="w-3 h-3 bg-purple-500 -rotate-45" 
        style={{ top: -10, left: '50%' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="yes" 
        className="w-3 h-3 bg-green-500 -rotate-45" 
        style={{ right: -10, top: '50%' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="no" 
        className="w-3 h-3 bg-red-500 -rotate-45" 
        style={{ bottom: -10, left: '50%' }}
      />
    </div>
  );
}

// Subprocess node
export function SubprocessNode({ data }: NodeProps) {
  return (
    <Card className="w-60 shadow-md min-h-[80px] bg-white dark:bg-gray-800 border-l-4 border-l-indigo-500">
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <CardDescription className="text-xs">
          {data.description || 'Subprocess'}
        </CardDescription>
      </CardContent>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="in" 
        className="w-3 h-3 bg-indigo-500" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="out" 
        className="w-3 h-3 bg-indigo-500" 
      />
    </Card>
  );
}

// Custom node styles
export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  task: TaskNode,
  decision: DecisionNode,
  subprocess: SubprocessNode
};

// Custom style for the diamond shape
export const customNodeStyles = `
  .diamond-node::before,
  .diamond-node::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: inherit;
    border: inherit;
    z-index: -1;
  }
`;