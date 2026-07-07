import React from "react"
import ConsultationsPage from "@/features/admin-consultations/components/ConsultationsPage"

export default function AdminConsultations(props: React.ComponentProps<typeof ConsultationsPage>) {
  return <ConsultationsPage {...props} />
}
