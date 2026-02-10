import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

interface DriverRatingsCardProps {
  driverId: number;
}

export default function DriverRatingsCard({ driverId }: DriverRatingsCardProps) {
  const { data: ratings, isLoading: ratingsLoading } = trpc.ratings.getDriverRatings.useQuery({ driverId });
  const { data: avgRating, isLoading: avgLoading } = trpc.ratings.getDriverAverageRating.useQuery({ driverId });

  if (ratingsLoading || avgLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  const totalRatings = ratings?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Avaliações</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={`${
                    i < Math.floor(avgRating || 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-gray-800">
              {avgRating?.toFixed(1) || "0.0"}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          {totalRatings} {totalRatings === 1 ? "avaliação" : "avaliações"}
        </p>

        {totalRatings === 0 ? (
          <p className="text-sm text-gray-500 italic">Nenhuma avaliação ainda</p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {ratings?.map((rating) => (
              <div key={rating.id} className="border-l-4 border-green-500 pl-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={`${
                          i < rating.stars
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(rating.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {rating.comment && (
                  <p className="text-sm text-gray-700">{rating.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
