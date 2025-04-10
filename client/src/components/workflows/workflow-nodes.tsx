import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Play, 
  Square, 
  Cog, 
  Plus, 
  HelpCircle, 
  User, 
  Clock, 
  Mail, 
  Zap, 
  MessageSquareText,
  FileText,
  PlusSquare 
} from 'lucide-react';

// Start node
export function StartNode({ data }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center bg-green-100 dark:bg-green-900 shadow-md rounded-full p-3 border-2 border-green-500 dark:border-green-700 min-w-[60px] min-h-[60px] text-center">
      <Play size={24} className="text-green-600 dark:text-green-400" />
      <div className="absolute -bottom-6 text-xs font-semibold text-green-600 dark:text-green-400">Start</div>
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
    <div className="relative flex items-center justify-center bg-red-100 dark:bg-red-900 shadow-md rounded-full p-3 border-2 border-red-500 dark:border-red-700 min-w-[60px] min-h-[60px] text-center">
      <Square size={24} className="text-red-600 dark:text-red-400" />
      <div className="absolute -bottom-6 text-xs font-semibold text-red-600 dark:text-red-400">End</div>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="in" 
        className="w-3 h-3 bg-red-500" 
      />
    </div>
  );
}

// Task node
export function TaskNode({ data }: NodeProps) {
  return (
    <Card className="w-60 shadow-md min-h-[90px] bg-blue-50 dark:bg-blue-900 border border-gray-300 dark:border-gray-600">
      <CardHeader className="p-3 pb-1 flex flex-row items-center gap-2">
        <Cog size={18} className="text-blue-500 dark:text-blue-300" />
        <div className="flex-1">
          <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
          {data.requirementId && (
            <Badge variant="outline" className="text-xs">REQ-{data.requirementId}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <CardDescription className="text-xs line-clamp-2 text-gray-700 dark:text-gray-300">
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

// User Task node
export function UserTaskNode({ data }: NodeProps) {
  return (
    <Card className="w-60 shadow-md min-h-[90px] bg-blue-100 dark:bg-blue-950 border border-gray-300 dark:border-gray-600">
      <CardHeader className="p-3 pb-1 flex flex-row items-center gap-2">
        <User size={18} className="text-blue-600 dark:text-blue-400" />
        <div className="flex-1">
          <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
          {data.requirementId && (
            <Badge variant="outline" className="text-xs">REQ-{data.requirementId}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <CardDescription className="text-xs line-clamp-2 text-gray-700 dark:text-gray-300">
          {data.description || 'User Task'}
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
    <div className="diamond-node bg-yellow-100 dark:bg-yellow-900 shadow-md border-2 border-orange-400 dark:border-orange-600 w-[140px] h-[140px] flex items-center justify-center transform rotate-45">
      <div className="transform -rotate-45 text-center w-full p-4">
        <div className="flex justify-center mb-1">
          <HelpCircle size={20} className="text-orange-500 dark:text-orange-300" />
        </div>
        <div className="font-medium text-sm">{data.label}</div>
        <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1 mt-1">
          {data.description || 'Yes/No'}
        </div>
      </div>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="in" 
        className="w-3 h-3 bg-orange-500 -rotate-45" 
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

// Parallel Gateway node
export function ParallelGatewayNode({ data }: NodeProps) {
  return (
    <div className="diamond-node bg-purple-100 dark:bg-purple-900 shadow-md border-2 border-purple-400 dark:border-purple-600 w-[120px] h-[120px] flex items-center justify-center transform rotate-45">
      <div className="transform -rotate-45 text-center w-full">
        <div className="flex justify-center">
          <Plus size={24} className="text-purple-600 dark:text-purple-300" />
        </div>
        <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
          {data.label || 'Parallel Gateway'}
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
        id="out1" 
        className="w-3 h-3 bg-purple-500 -rotate-45" 
        style={{ right: -10, top: '50%' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="out2" 
        className="w-3 h-3 bg-purple-500 -rotate-45" 
        style={{ bottom: -10, left: '50%' }}
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="out3" 
        className="w-3 h-3 bg-purple-500 -rotate-45" 
        style={{ left: -10, top: '50%' }}
      />
    </div>
  );
}

// Subprocess node
export function SubprocessNode({ data }: NodeProps) {
  return (
    <Card className="w-60 shadow-md min-h-[90px] bg-indigo-50 dark:bg-indigo-900 border-2 border-indigo-300 dark:border-indigo-600">
      <CardHeader className="p-3 pb-1 flex flex-row items-center gap-2">
        <PlusSquare size={18} className="text-indigo-500 dark:text-indigo-300" />
        <div className="flex-1">
          <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <CardDescription className="text-xs text-gray-700 dark:text-gray-300">
          {data.description || 'Expand subprocess'}
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

// Wait/Delay node
export function WaitNode({ data }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center bg-amber-100 dark:bg-amber-900 shadow-md rounded-full p-3 border-2 border-amber-500 dark:border-amber-700 min-w-[60px] min-h-[60px] text-center">
      <Clock size={24} className="text-amber-600 dark:text-amber-400" />
      <div className="absolute -bottom-6 w-20 text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
        {data.label || 'Wait'}
      </div>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="in" 
        className="w-3 h-3 bg-amber-500" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="out" 
        className="w-3 h-3 bg-amber-500" 
      />
    </div>
  );
}

// Message Event node
export function MessageEventNode({ data }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center bg-orange-100 dark:bg-orange-900 shadow-md rounded-full p-3 border-2 border-teal-500 dark:border-teal-700 min-w-[60px] min-h-[60px] text-center">
      <Mail size={24} className="text-teal-600 dark:text-teal-400" />
      <div className="absolute -bottom-6 w-20 text-xs font-semibold text-teal-600 dark:text-teal-400">
        {data.label || 'Message'}
      </div>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="in" 
        className="w-3 h-3 bg-teal-500" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="out" 
        className="w-3 h-3 bg-teal-500" 
      />
    </div>
  );
}

// Error Event node
export function ErrorEventNode({ data }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center bg-red-50 dark:bg-red-950 shadow-md rounded-full p-3 border-2 border-red-500 dark:border-red-700 min-w-[60px] min-h-[60px] text-center">
      <Zap size={24} className="text-red-600 dark:text-red-400" />
      <div className="absolute -bottom-6 w-20 text-xs font-semibold text-red-600 dark:text-red-400">
        {data.label || 'Error'}
      </div>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="in" 
        className="w-3 h-3 bg-red-500" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="out" 
        className="w-3 h-3 bg-red-500" 
      />
    </div>
  );
}

// Annotation node
export function AnnotationNode({ data }: NodeProps) {
  return (
    <div className="relative flex items-start p-2 bg-transparent shadow-none border-l-2 border-gray-400 dark:border-gray-500 min-w-[160px] min-h-[60px]">
      <MessageSquareText size={18} className="text-gray-500 dark:text-gray-400 mr-2 mt-1 shrink-0" />
      <div className="text-xs text-gray-600 dark:text-gray-300">
        {data.label || data.description || 'Annotation'}
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="in" 
        className="w-2 h-2 bg-gray-400 border-dashed" 
        style={{ left: -1, top: '50%' }}
      />
    </div>
  );
}

// Custom node styles
export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  task: TaskNode,
  userTask: UserTaskNode,
  decision: DecisionNode,
  subprocess: SubprocessNode,
  parallel: ParallelGatewayNode,
  wait: WaitNode,
  message: MessageEventNode,
  error: ErrorEventNode,
  annotation: AnnotationNode
};

// Custom style for the diamond shape and other node styles
export const customNodeStyles = `
  .diamond-node {
    position: relative;
  }
  
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
  
  /* Dotted line for annotation */
  .annotation-connection {
    stroke-dasharray: 5;
    animation: dashdraw 0.5s linear infinite;
  }
  
  @keyframes dashdraw {
    from {
      stroke-dashoffset: 10;
    }
  }
`;