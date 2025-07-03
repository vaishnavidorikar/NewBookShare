import { useState, useEffect } from 'react';
import { Plus, BookOpen, Edit, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  condition: string;
  status: string;
  description: string;
  pages: number;
  publication_year: number;
  isbn: string;
  latitude?: number;
  longitude?: number;
}

const Library = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    genre: '',
    condition: 'good',
    status: 'available',
    description: '',
    pages: '',
    publication_year: '',
    isbn: '',
    latitude: '',
    longitude: '',
    start_date: '',
    due_date: ''
  });
  const [fetchingBook, setFetchingBook] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const containerStyle = { width: '100%', height: '400px' };
  const center = { lat: books[0]?.latitude || 28.6139, lng: books[0]?.longitude || 77.2090 };
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY' });

  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [user]);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch books",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBookInfo = async () => {
    if (!formData.isbn) return;
    setFetchingBook(true);
    try {
      const isbn = formData.isbn.replace(/[-\s]/g, '');
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const data = await res.json();
      const bookData = data[`ISBN:${isbn}`];
      if (bookData) {
        setFormData((prev) => ({
          ...prev,
          title: bookData.title || prev.title,
          author: bookData.authors ? bookData.authors.map((a: any) => a.name).join(', ') : prev.author,
          pages: bookData.number_of_pages ? String(bookData.number_of_pages) : prev.pages,
          publication_year: bookData.publish_date ? (bookData.publish_date.match(/\d{4}/)?.[0] || prev.publication_year) : prev.publication_year,
          description: typeof bookData.description === 'string' ? bookData.description : (bookData.description?.value || prev.description),
        }));
        toast({ title: 'Book info fetched!', description: 'Fields auto-filled. Please review and complete any missing info.' });
      } else {
        toast({ title: 'Not found', description: 'No book found for this ISBN.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch book info.', variant: 'destructive' });
    } finally {
      setFetchingBook(false);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('books')
        .insert({
          title: formData.title,
          author: formData.author,
          genre: formData.genre,
          condition: formData.condition as 'excellent' | 'good' | 'fair' | 'poor',
          status: formData.status as 'available' | 'borrowed' | 'for_sale' | 'not_available',
          description: formData.description,
          owner_id: user?.id,
          pages: formData.pages ? parseInt(formData.pages) : null,
          publication_year: formData.publication_year ? parseInt(formData.publication_year) : null,
          isbn: formData.isbn,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          start_date: formData.start_date,
          due_date: formData.due_date
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Book added to your library!",
      });
      
      setShowAddDialog(false);
      setFormData({
        title: '',
        author: '',
        genre: '',
        condition: 'good',
        status: 'available',
        description: '',
        pages: '',
        publication_year: '',
        isbn: '',
        latitude: '',
        longitude: '',
        start_date: '',
        due_date: ''
      });
      fetchBooks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);
      if (error) throw error;
      toast({
        title: 'Deleted',
        description: 'Book has been deleted.',
      });
      fetchBooks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'borrowed': return 'bg-yellow-100 text-yellow-800';
      case 'for_sale': return 'bg-blue-100 text-blue-800';
      case 'not_available': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading your library...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Library</h1>
          <p className="text-muted-foreground">Manage your book collection</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Book</DialogTitle>
              <DialogDescription>
                Add a book to your personal library
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddBook} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({...formData, author: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={formData.genre}
                  onChange={(e) => setFormData({...formData, genre: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select value={formData.condition} onValueChange={(value) => setFormData({...formData, condition: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                    <SelectItem value="for_sale">For Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN</Label>
                <div className="flex gap-2">
                  <Input
                    id="isbn"
                    value={formData.isbn}
                    onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                    placeholder="Enter ISBN"
                  />
                  <Button type="button" onClick={fetchBookInfo} disabled={fetchingBook || !formData.isbn} variant="outline">
                    {fetchingBook ? 'Fetching...' : 'Fetch Book Info'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  value={formData.latitude}
                  onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                  placeholder="Enter latitude or use browser location"
                  type="number"
                  step="any"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  value={formData.longitude}
                  onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                  placeholder="Enter longitude or use browser location"
                  type="number"
                  step="any"
                />
              </div>
              <Button type="button" onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setFormData((prev) => ({ ...prev, latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() }));
                  });
                }
              }}>Use My Location</Button>
              <Button type="submit" className="w-full">Add Book</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {books.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No books in your library</h3>
            <p className="text-muted-foreground mb-4">Start building your personal library by adding your first book!</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Book
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-4 mb-6">
            <div className="bg-green-100 p-4 rounded flex items-center gap-2">
              <span role="img" aria-label="trophy">🏆</span>
              <span>{books.length} Books in Library</span>
            </div>
            <div className="bg-blue-100 p-4 rounded flex items-center gap-2">
              <span role="img" aria-label="open book">📖</span>
              <span>{books.filter(b => b.status === 'available').length} Available</span>
            </div>
            <div className="bg-yellow-100 p-4 rounded flex items-center gap-2">
              <span role="img" aria-label="borrowed">🤝</span>
              <span>{books.filter(b => b.status === 'borrowed').length} Borrowed</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <Card key={book.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                      <CardDescription>by {book.author}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(book.status)}>
                      {book.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {book.genre && (
                      <p className="text-sm text-muted-foreground">Genre: {book.genre}</p>
                    )}
                    <p className="text-sm text-muted-foreground">Condition: {book.condition}</p>
                    {book.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{book.description}</p>
                    )}
                    <div className="flex justify-between items-center pt-4">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteBook(book.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {isLoaded && (
            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12}>
              {books.filter(b => b.latitude && b.longitude).map(book => (
                <Marker key={book.id} position={{ lat: book.latitude, lng: book.longitude }} title={book.title} />
              ))}
            </GoogleMap>
          )}
        </>
      )}
    </div>
  );
};

export default Library;