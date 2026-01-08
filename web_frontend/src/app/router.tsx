import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import CalendarsPage from '../pages/CalendarsPage'
import MembersPage from '../pages/MembersPage'
import MonthPage from '../pages/MonthPage'
import EventEditorPage from '../pages/EventEditorPage'
import TaskPage from '../pages/TaskPage'
import Layout from '../components/Layout'
import { getToken } from './auth'

const Private = ({ children }: { children: JSX.Element }) => {
  const token = getToken()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function Router() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <Private>
            <Layout />
          </Private>
        }
      >
        <Route index element={<Navigate to="/calendars" replace />} />
        <Route path="calendars" element={<CalendarsPage />} />
        <Route path="calendars/:id/members" element={<MembersPage />} />
        <Route path="calendars/:id/month" element={<MonthPage />} />
        <Route path="calendars/:id/events/new" element={<EventEditorPage />} />
        <Route path="calendars/:id/events/:eventId/edit" element={<EventEditorPage />} />
        <Route path="calendars/:id/tasks" element={<TaskPage />} />
      </Route>
    </Routes>
  )
}
