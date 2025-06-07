import Image from 'next/image';
import type { MenuItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, MinusCircle, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, quantity: number, notes?: string) => void;
  quantityInCart: number;
}

export function MenuItemCard({ item, onAddToCart, quantityInCart }: MenuItemCardProps) {
  // For simplicity, quantity management is basic. A real app would use state.
  const handleIncrease = () => onAddToCart(item, quantityInCart + 1);
  const handleDecrease = () => {
    if (quantityInCart > 0) {
      onAddToCart(item, quantityInCart - 1);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      {item.imageUrl && (
        <div className="relative h-48 w-full">
          <Image 
            src={item.imageUrl} 
            alt={item.name} 
            layout="fill" 
            objectFit="cover" 
            data-ai-hint={item.dataAiHint || "food item"}
           />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground h-10 overflow-hidden">{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
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
        {/* Basic notes functionality - could be a dialog */}
        {/* <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-accent">
          <MessageSquare className="mr-2 h-4 w-4" /> Add Note
        </Button> */}
      </CardFooter>
    </Card>
  );
}
