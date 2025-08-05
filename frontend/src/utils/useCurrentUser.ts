import { useEffect, useState } from "react"
import { fetchCurrentUser, User } from "../utils/auth"

export const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  return user
}
