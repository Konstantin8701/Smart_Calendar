export type User = {
  id: string
  email: string
}

export type CalendarItem = {
  id: string
  title: string
  owner: string
  role: number
}

export type Member = {
  user_id: string
  email: string
  role: number
}

export type Event = {
  id: string
  calendar_id?: string
  title: string
  description?: string | null
  start_ts: string
  end_ts?: string | null
}

export type Task = {
  id: string
  calendar_id?: string
  title: string
  description?: string | null
  due_ts?: string | null
  status: number
}
