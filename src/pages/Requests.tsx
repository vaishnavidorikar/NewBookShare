import { useState, useEffect } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const Requests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('borrow_requests')
        .select(`
          *,
          books (title, author),
          borrower_profile:profiles!borrower_id (full_name),
          lender_profile:profiles!lender_id (full_name)
        `)
        .or(`borrower_id.eq.${user?.id},lender_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Borrow Requests</h1>
        <p className="text-muted-foreground">Manage your lending and borrowing requests</p>
      </div>

      {requests.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No requests found</h3>
            <p className="text-muted-foreground">You have no pending borrow requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{request.books?.title}</CardTitle>
                    <CardDescription>by {request.books?.author}</CardDescription>
                  </div>
                  <Badge variant={request.status === 'pending' ? 'default' : 'secondary'}>
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm">
                      <strong>
                        {request.borrower_id === user?.id ? 'Lender' : 'Borrower'}:
                      </strong>{' '}
                      {request.borrower_id === user?.id 
                        ? request.lender_profile?.full_name 
                        : request.borrower_profile?.full_name
                      }
                    </p>
                    {request.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{request.notes}</p>
                    )}
                  </div>
                  
                  {request.status === 'pending' && request.lender_id === user?.id && (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Requests;