import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Requirement } from "@/lib/types";
import { Link } from "wouter";

interface ContradictionDetectorProps {
  projectId: number;
}

// Interface for the quality check response
interface QualityCheckResponse {
  contradictions: {
    requirement1: {
      id: number;
      text: string;
    };
    requirement2: {
      id: number;
      text: string;
    };
    similarity_score: number;
    nli_contradiction_score: number;
  }[];
  totalRequirements: number;
  processing_time: number;
  errors?: string; // New field to track API errors
}

export function ContradictionDetector({ projectId }: ContradictionDetectorProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  // Query for requirement quality check
  const {
    data: qualityCheck,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery<QualityCheckResponse>({
    queryKey: [`/api/projects/${projectId}/requirements/quality-check`],
    enabled: false, // Don't run on component mount
  });

  // Handle check for contradictions
  const handleCheckContradictions = () => {
    toast({
      title: "Analyzing requirements",
      description: "Checking for contradictions and duplicates...",
      duration: 2000,
    });
    refetch();
  };

  // Format contradiction severity based on score
  const getSeverityLevel = (score: number) => {
    if (score >= 0.9) return { label: "High", color: "destructive" };
    if (score >= 0.7) return { label: "Medium", color: "warning" };
    return { label: "Low", color: "info" };
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Requirement Quality Check</CardTitle>
        <CardDescription>
          Check for contradictions and duplicates in your requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isExpanded ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This tool analyzes your project requirements to find potential contradictions
              and duplicates that might cause issues during implementation.
            </p>
            <Button 
              onClick={() => setIsExpanded(true)}
              variant="outline"
              className="w-full"
            >
              Show Quality Check Tools
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Requirement Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Detect potential issues in your requirements
                </p>
              </div>
              <Button 
                onClick={handleCheckContradictions}
                disabled={isFetching}
                variant="default"
              >
                {isFetching ? "Analyzing..." : "Check Requirements"}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to analyze requirements. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {isFetching && (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {qualityCheck && !isFetching && (
              <div className="space-y-4">
                {qualityCheck.errors && (
                  <Alert className="bg-yellow-50 text-yellow-800 border-yellow-100">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      {qualityCheck.errors}
                      <p className="text-sm mt-2">Results may be incomplete due to API limitations.</p>
                    </AlertDescription>
                  </Alert>
                )}
              
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      Analyzed {qualityCheck.totalRequirements} requirements in {qualityCheck.processing_time.toFixed(2)} seconds
                    </p>
                  </div>
                  {qualityCheck.contradictions.length > 0 ? (
                    <Badge variant="destructive">
                      {qualityCheck.contradictions.length} Potential {qualityCheck.contradictions.length === 1 ? 'Issue' : 'Issues'} Found
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      No Issues Found
                    </Badge>
                  )}
                </div>

                {qualityCheck.contradictions.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {qualityCheck.contradictions.map((contradiction, index) => {
                      const severity = getSeverityLevel(contradiction.nli_contradiction_score);
                      return (
                        <AccordionItem value={`contradiction-${index}`} key={index}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center">
                              <AlertTriangle className={`h-4 w-4 mr-2 ${severity.color === 'destructive' ? 'text-red-500' : severity.color === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`} />
                              <span>Potential Contradiction - Severity: {severity.label}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 p-2">
                              <div className="flex items-start space-x-2 pb-2">
                                <div className="flex-1 p-3 border rounded-md bg-gray-50 dark:bg-gray-900">
                                  <p className="text-sm mb-2 font-medium">Requirement 1:</p>
                                  <p className="text-sm">{contradiction.requirement1.text}</p>
                                  <div className="mt-2">
                                    <Link href={`/projects/${projectId}/requirements/${contradiction.requirement1.id}`}>
                                      <Button variant="outline" size="sm">View Requirement</Button>
                                    </Link>
                                  </div>
                                </div>
                                <ArrowRightLeft className="h-5 w-5 mt-10" />
                                <div className="flex-1 p-3 border rounded-md bg-gray-50 dark:bg-gray-900">
                                  <p className="text-sm mb-2 font-medium">Requirement 2:</p>
                                  <p className="text-sm">{contradiction.requirement2.text}</p>
                                  <div className="mt-2">
                                    <Link href={`/projects/${projectId}/requirements/${contradiction.requirement2.id}`}>
                                      <Button variant="outline" size="sm">View Requirement</Button>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Analysis</AlertTitle>
                                <AlertDescription>
                                  <p className="text-sm">
                                    These requirements appear to contradict each other with a {(contradiction.nli_contradiction_score * 100).toFixed(0)}% confidence score.
                                    They have a similarity score of {(contradiction.similarity_score * 100).toFixed(0)}%.
                                  </p>
                                  <p className="text-sm mt-2">
                                    Consider revising one or both requirements to resolve the contradiction.
                                  </p>
                                </AlertDescription>
                              </Alert>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  qualityCheck.totalRequirements > 0 && (
                    <Alert className="bg-green-50 text-green-800 border-green-100">
                      <Info className="h-4 w-4" />
                      <AlertTitle>No Issues Found</AlertTitle>
                      <AlertDescription>
                        No contradictions or duplicates were detected in your requirements.
                      </AlertDescription>
                    </Alert>
                  )
                )}
              </div>
            )}

            <Button 
              onClick={() => setIsExpanded(false)}
              variant="outline"
              className="w-full mt-4"
            >
              Hide Quality Check Tools
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}