import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function PayPalDebug() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setIsLoading(true);
    try {
      const startTime = Date.now();
      const result = await testFn();
      const endTime = Date.now();
      
      setTestResults(prev => [...prev, {
        name: testName,
        status: 'success',
        duration: endTime - startTime,
        result,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      toast({
        title: "Test Passed",
        description: `${testName} completed successfully`,
      });
    } catch (error: any) {
      setTestResults(prev => [...prev, {
        name: testName,
        status: 'error',
        error: error.message,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      toast({
        title: "Test Failed",
        description: `${testName}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testPayPalSetup = async () => {
    const response = await apiRequest('GET', '/api/paypal/setup');
    return response.json();
  };

  const testOrderCreation = async () => {
    const response = await apiRequest('POST', '/api/paypal/order', {
      amount: '9.99',
      currency: 'USD',
      intent: 'CAPTURE'
    });
    return response.json();
  };

  const testSubscriptionCreation = async () => {
    const response = await apiRequest('POST', '/api/subscription/create', {
      tier: 'basic',
      demo: false
    });
    return response.json();
  };

  const testDemoMode = async () => {
    const response = await apiRequest('POST', '/api/subscription/create', {
      tier: 'basic',
      demo: true
    });
    return response.json();
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">PayPal Integration Debug</h1>
        <p className="text-muted-foreground">
          Test PayPal integration components to diagnose sandbox checkout issues
        </p>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          <strong>Known Issue:</strong> PayPal sandbox checkout may show "Sorry, something went wrong" 
          despite successful order creation. This is typically due to PayPal Developer Console configuration 
          or sandbox account verification issues.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Test PayPal Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => runTest('PayPal Setup', testPayPalSetup)}
              disabled={isLoading}
              className="w-full"
            >
              Test PayPal Setup & Client Token
            </Button>
            
            <Button 
              onClick={() => runTest('Order Creation', testOrderCreation)}
              disabled={isLoading}
              className="w-full"
            >
              Test Order Creation (Basic Plan)
            </Button>
            
            <Button 
              onClick={() => runTest('Subscription Creation', testSubscriptionCreation)}
              disabled={isLoading}
              className="w-full"
            >
              Test Live PayPal Subscription
            </Button>
            
            <Button 
              onClick={() => runTest('Demo Mode', testDemoMode)}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              Test Demo Mode (Working Alternative)
            </Button>

            <Button 
              onClick={clearResults}
              disabled={isLoading}
              variant="secondary"
              className="w-full"
            >
              Clear Results
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold">If Order Creation Works:</h4>
                <p className="text-muted-foreground">
                  The issue is likely in PayPal's sandbox environment. Order creation success (HTTP 201) 
                  indicates our integration is correct.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold">Potential Solutions:</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Verify PayPal Developer Account is fully set up</li>
                  <li>Check sandbox account email verification</li>
                  <li>Try different PayPal sandbox test accounts</li>
                  <li>Contact PayPal Developer Support</li>
                  <li>Use demo mode for testing subscription flow</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold">Demo Mode Benefits:</h4>
                <p className="text-muted-foreground">
                  Allows testing the complete subscription activation flow without 
                  PayPal dependencies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{result.name}</h4>
                      <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                        {result.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{result.timestamp}</span>
                  </div>
                  
                  {result.status === 'success' && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Duration: {result.duration}ms
                      </p>
                      <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {result.status === 'error' && (
                    <p className="text-red-600 text-sm">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}