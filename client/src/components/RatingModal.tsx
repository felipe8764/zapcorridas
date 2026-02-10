import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: number;
  driverId: number;
  passengerId: number;
  driverName: string;
  onSuccess?: () => void;
}

export default function RatingModal({
  open,
  onOpenChange,
  rideId,
  driverId,
  passengerId,
  driverName,
  onSuccess,
}: RatingModalProps) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  const createRating = trpc.ratings.createRating.useMutation({
    onSuccess: () => {
      toast.success("Avaliação enviada com sucesso!");
      setStars(0);
      setComment("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar avaliação");
    },
  });

  const handleSubmit = () => {
    if (stars === 0) {
      toast.error("Selecione uma classificação");
      return;
    }

    createRating.mutate({
      rideId,
      driverId,
      passengerId,
      stars,
      comment: comment || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar Motorista</DialogTitle>
          <DialogDescription>
            Como foi sua experiência com {driverName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setStars(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={40}
                  className={`${
                    star <= (hoveredStar || stars)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  } transition-colors`}
                />
              </button>
            ))}
          </div>

          {/* Star Label */}
          {stars > 0 && (
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                {stars === 1 && "Muito ruim"}
                {stars === 2 && "Ruim"}
                {stars === 3 && "Bom"}
                {stars === 4 && "Muito bom"}
                {stars === 5 && "Excelente"}
              </p>
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comentário (opcional)
            </label>
            <Textarea
              placeholder="Compartilhe sua experiência..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              className="resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              {comment.length}/500 caracteres
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={stars === 0 || createRating.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {createRating.isPending ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
