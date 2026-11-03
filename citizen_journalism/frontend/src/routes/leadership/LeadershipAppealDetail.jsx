import { useParams } from 'react-router-dom'
import AccountPenaltyAppealReview from '../../components/appeals/AccountPenaltyAppealReview'

export default function AppealDetail() {
  const { id } = useParams()
  return <AccountPenaltyAppealReview key={id} id={id} scope="leadership" />
}
