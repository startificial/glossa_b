import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link as ExternalLink, ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { ImplementationStep } from '@/lib/types';

interface ImplementationStepsTableProps {
  steps: ImplementationStep[];
  isEditing?: boolean;
}

export function ImplementationStepsTable({ steps, isEditing = false }: ImplementationStepsTableProps) {
  if (!steps || steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Implementation Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No implementation steps available for this task.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Implementation Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[200px]">Documentation Links</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map((step) => (
              <TableRow key={step.stepNumber}>
                <TableCell className="font-medium">{step.stepNumber}</TableCell>
                <TableCell>{step.stepDescription}</TableCell>
                <TableCell>
                  {step.relevantDocumentationLinks && step.relevantDocumentationLinks.length > 0 ? (
                    <div className="space-y-1">
                      {step.relevantDocumentationLinks.map((link, linkIndex) => (
                        <div key={linkIndex} className="flex items-center">
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center"
                          >
                            <ExternalLinkIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {link.replace(/^https?:\/\//, '').split('/')[0]}
                            </span>
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No links available</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}