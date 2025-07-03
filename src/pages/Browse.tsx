import { useState, useEffect } from 'react';
import { Search, MapPin, BookOpen, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface BookWithOwner {
  id: string;
  title: string;
  author: string;
  genre: string;
  condition: string;
  status: string;
  description: string;
  pages: number;
  publication_year: number;
  start_date: string;
  due_date: string;
  owner_id: string;
  profiles: {
    full_name: string;
    location: string;
  };
}

const Browse = () => {
  const [books, setBooks] = useState<BookWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailableBooks();
  }, []);

  const fetchAvailableBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          id,
          title,
          author,
          genre,
          condition,
          status,
          description,
          pages,
          publication_year,
          start_date,
          due_date,
          owner_id,
          profiles (
            full_name,
            location
          )
        `)
        .eq('status', 'available')
        .neq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch available books",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowRequest = async (bookId: string, ownerId: string) => {
    try {
      const { error } = await supabase
        .from('borrow_requests')
        .insert({
          book_id: bookId,
          borrower_id: user?.id,
          lender_id: ownerId,
          notes: 'Borrow request sent through browse page'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Borrow request sent to the owner!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.genre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading available books...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Browse Books</h1>
          <p className="text-muted-foreground">Discover books available for borrowing from the community</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by title, author, or genre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No books found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search criteria' : 'No books are currently available for borrowing'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                  <CardDescription>by {book.author}</CardDescription>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{book.profiles?.full_name}</span>
                    {book.profiles?.location && (
                      <>
                        <MapPin className="h-3 w-3 ml-2" />
                        <span>{book.profiles.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    {book.genre && (
                      <p className="text-sm text-muted-foreground">Genre: {book.genre}</p>
                    )}
                    <div className="flex gap-2">
                      <Badge className={getConditionColor(book.condition)}>
                        {book.condition}
                      </Badge>
                      <Badge variant="outline">Available</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available: {book.start_date} to {book.due_date}
                    </p>
                    {book.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{book.description}</p>
                    )}
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleBorrowRequest(book.id, book.owner_id)}
                  >
                    Request to Borrow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Browse;