import { useState, useEffect } from 'react';
import { BookOpen, Users, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const [stats, setStats] = useState({
    totalBooks: 0,
    availableBooks: 0,
    borrowedBooks: 0,
    pendingRequests: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch user's books
      const { data: userBooks } = await supabase
        .from('books')
        .select('*')
        .eq('owner_id', user?.id);

      // Fetch pending requests
      const { data: requests } = await supabase
        .from('borrow_requests')
        .select('*')
        .or(`borrower_id.eq.${user?.id},lender_id.eq.${user?.id}`)
        .eq('status', 'pending');

      setStats({
        totalBooks: userBooks?.length || 0,
        availableBooks: userBooks?.filter(book => book.status === 'available').length || 0,
        borrowedBooks: userBooks?.filter(book => book.status === 'borrowed').length || 0,
        pendingRequests: requests?.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome to Bookshelf! 📚</h1>
        <p className="text-muted-foreground">Your personal library manager and book sharing platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBooks}</div>
            <p className="text-xs text-muted-foreground">Books in your library</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableBooks}</div>
            <p className="text-xs text-muted-foreground">Ready to share</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borrowed Out</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.borrowedBooks}</div>
            <p className="text-xs text-muted-foreground">Currently lent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Build your book sharing community</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">📖 Add Your Books</h4>
              <p className="text-sm text-muted-foreground">Start by adding books to your personal library</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🔍 Browse & Borrow</h4>
              <p className="text-sm text-muted-foreground">Discover books from other users in your community</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🤝 Share & Lend</h4>
              <p className="text-sm text-muted-foreground">Make your books available for others to borrow</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">📊 Track Progress</h4>
              <p className="text-sm text-muted-foreground">Monitor your reading journey and borrowing history</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
