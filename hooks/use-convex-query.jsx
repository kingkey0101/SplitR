import { useEffect, useState } from "react";
import { toast } from "sonner";

export const useConvexQuery = (query, ...args) => {
  const result = useQuery(query);

  const [data, setData] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (result === undefined) {
        setIsLoading(true);
    } else{
        try{
            setData(result);
            setError(null);
        } catch (err) {
            setError(err);
            toast.error(err.message);
        } finally{setIsLoading(false); 
            
        }
    }
  }, [result])
};
