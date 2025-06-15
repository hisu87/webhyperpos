
import Image from 'next/image';
import type { MenuItem as NewMenuItemType } from '@/lib/types'; // Updated type
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, MinusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MenuItemCardProps {
  item: NewMenuItemType; // Use the new MenuItem type from the sub-collection
  onAddToCart: (item: NewMenuItemType, quantity: number, notes?: string) => void;
  quantityInCart: number;
}

export function MenuItemCard({ item, onAddToCart, quantityInCart }: MenuItemCardProps) {
  const handleIncrease = () => onAddToCart(item, quantityInCart + 1);
  const handleDecrease = () => {
    if (quantityInCart > 0) {
      onAddToCart(item, quantityInCart - 1);
    }
  };

  // The new MenuItem schema is simpler, missing imageUrl, description directly.
  // This card will adapt, but might look different.
  // For images/detailed descriptions, you might need another layer of data fetching or a different structure.

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* item.imageUrl is not in the new MenuItem schema for sub-collections */}
      {/* Consider adding a placeholder or fetching image based on item.id from another source if needed */}
      <div className="relative h-48 w-full bg-muted flex items-center justify-center">
         <span className="text-muted-foreground text-sm">No Image</span>
         {/* Placeholder for image: <Image src={item.imageUrl || `https://placehold.co/300x200.png?text=${item.name.charAt(0)}`} alt={item.name} layout="fill" objectFit="cover" data-ai-hint="food item" /> */}
      </div>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
        {/* item.description is not in the new MenuItem schema */}
        <CardDescription className="text-sm text-muted-foreground h-10 overflow-hidden">
          Category: {item.category} - Unit: {item.unit}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
        {!item.available && <p className="text-sm text-destructive">Currently unavailable</p>}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
        {item.available && (
          <>
            {quantityInCart === 0 ? (
              <Button onClick={handleIncrease} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Add to Order
              </Button>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="icon" onClick={handleDecrease}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
                <Input type="number" value={quantityInCart} readOnly className="w-16 text-center" />
                <Button variant="outline" size="icon" onClick={handleIncrease}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
