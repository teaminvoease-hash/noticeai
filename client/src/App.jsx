import {Downloads,Delivery,Notifications,Wallet,SignedUploads,PaymentResult,Operations,Integrations,AdminDocuments} from './LiveScreens';
import React,{lazy,Suspense} from 'react';
import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {useSelector} from 'react-redux';
import Home from './Home';
import './portal.css';
import './enhancements.css';
import './upgrade.css';
const AdminDashboard=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminDashboard'));
const AdminUsersPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminUsersPage'));
const AdminUsersCreatePage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminUsersCreatePage'));
const AdminAdvocatesPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminAdvocatesPage'));
const AdminAdvocatesCreatePage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminAdvocatesCreatePage'));
const AdminNoticesPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminNoticesPage'));
const AdminNoticesCreatePage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminNoticesCreatePage'));
const AdminPaymentsPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminPaymentsPage'));
const AdminPaymentsCreatePage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminPaymentsCreatePage'));
const AdminWithdrawalsPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminWithdrawalsPage'));
const AdminWithdrawalsCreatePage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminWithdrawalsCreatePage'));
const AdminDocumentsCreatePage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminDocumentsCreatePage'));
const AdminTemplatesPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminTemplatesPage'));
const AdminTemplatesCreatePage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminTemplatesCreatePage'));
const ClientDashboard=lazy(()=>import('./AdminDashboard/dashscreen/eraser/ClientDashboard'));
const ClientNoticeSubmission=lazy(()=>import('./AdminDashboard/dashscreen/eraser/ClientNoticeSubmission'));
const ClientDefaultersPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/ClientDefaultersPage'));
const ClientDefaultersCreatePage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/ClientDefaultersCreatePage'));
const ClientMyNotices=lazy(()=>import('./AdminDashboard/dashscreen/eraser/ClientMyNotices'));
const ClientDocuments=lazy(()=>import('./AdminDashboard/dashscreen/eraser/ClientDocuments'));
const ClientPayments=lazy(()=>import('./AdminDashboard/dashscreen/eraser/ClientPayments'));
const ClientProfilePage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/ClientProfilePage'));
const LawyerDashboard=lazy(()=>import('./AdminDashboard/dashscreen/eraser/LawyerDashboard'));
const LawyerAssignedNoticesPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/LawyerAssignedNoticesPage'));
const LawyerDocumentRequestsPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/LawyerDocumentRequestsPage'));
const LawyerDocumentRequestsDisplayPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/LawyerDocumentRequestsDisplayPage'));
const LawyerWithdrawalRequestsPage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/LawyerWithdrawalRequestsPage'));
const LawyerProfilePage=lazy(()=>import('./AdminDashboard/dashscreen/eraser/LawyerProfilePage'));
const AdminLogin=lazy(()=>import('./AdminDashboard/dashscreen/eraser/AdminLogin'));
const ClientLogin=lazy(()=>import('./AdminDashboard/dashscreen/eraser/ClientLogin'));
const ClientRegister=lazy(()=>import('./AdminDashboard/dashscreen/eraser/ClientRegister'));
const LawyerLogin=lazy(()=>import('./AdminDashboard/dashscreen/eraser/LawyerLogin'));
const LawyerRegister=lazy(()=>import('./AdminDashboard/dashscreen/eraser/LawyerRegister'));
function Protected({role,children}){const user=useSelector(s=>s.userReducer.userData);return user?.role===role?children:<Navigate to={'/'+role+'-login'} replace/>}
export default function App(){return <BrowserRouter><Suspense fallback={<main className="auth-panel">Loading portal…</main>}><Routes><Route path="/admin-operations" element={<Protected role="admin"><Operations/></Protected>}/><Route path="/" element={<Home/>}/>
<Route path="/admin-dashboard" element={<Protected role="admin"><AdminDashboard/></Protected>}/>
<Route path="/admin-users" element={<Protected role="admin"><AdminUsersPage/></Protected>}/>
<Route path="/admin-users-create" element={<Protected role="admin"><AdminUsersCreatePage/></Protected>}/>
<Route path="/admin-advocates" element={<Protected role="admin"><AdminAdvocatesPage/></Protected>}/>
<Route path="/admin-advocates-create" element={<Protected role="admin"><AdminAdvocatesCreatePage/></Protected>}/>
<Route path="/admin-notices" element={<Protected role="admin"><AdminNoticesPage/></Protected>}/>
<Route path="/admin-notices-create" element={<Protected role="admin"><AdminNoticesCreatePage/></Protected>}/>
<Route path="/admin-payments" element={<Protected role="admin"><AdminPaymentsPage/></Protected>}/>
<Route path="/admin-payments-create" element={<Protected role="admin"><AdminPaymentsCreatePage/></Protected>}/>
<Route path="/admin-withdrawals" element={<Protected role="admin"><AdminWithdrawalsPage/></Protected>}/>
<Route path="/admin-withdrawals-create" element={<Protected role="admin"><AdminWithdrawalsCreatePage/></Protected>}/>
<Route path="/admin-documents" element={<Protected role="admin"><AdminDocuments/></Protected>}/>
<Route path="/admin-documents-create" element={<Protected role="admin"><AdminDocumentsCreatePage/></Protected>}/>
<Route path="/admin-templates" element={<Protected role="admin"><AdminTemplatesPage/></Protected>}/>
<Route path="/admin-templates-create" element={<Protected role="admin"><AdminTemplatesCreatePage/></Protected>}/>
<Route path="/admin-integrations" element={<Protected role="admin"><Integrations/></Protected>}/>
<Route path="/admin-integrations-create" element={<Protected role="admin"><Integrations/></Protected>}/>
<Route path="/client-dashboard" element={<Protected role="client"><ClientDashboard/></Protected>}/>
<Route path="/client-notice-submission" element={<Protected role="client"><ClientNoticeSubmission/></Protected>}/>
<Route path="/client-defaulters" element={<Protected role="client"><ClientDefaultersPage/></Protected>}/>
<Route path="/client-defaulters-create" element={<Protected role="client"><ClientDefaultersCreatePage/></Protected>}/>
<Route path="/client-my-notices" element={<Protected role="client"><ClientMyNotices/></Protected>}/>
<Route path="/client-documents" element={<Protected role="client"><ClientDocuments/></Protected>}/>
<Route path="/client-payments" element={<Protected role="client"><ClientPayments/></Protected>}/>
<Route path="/client-delivery-tracking" element={<Protected role="client"><Delivery/></Protected>}/>
<Route path="/client-downloads" element={<Protected role="client"><Downloads/></Protected>}/>
<Route path="/client-profile" element={<Protected role="client"><ClientProfilePage/></Protected>}/>
<Route path="/client-notifications" element={<Protected role="client"><Notifications/></Protected>}/>
<Route path="/lawyer-dashboard" element={<Protected role="lawyer"><LawyerDashboard/></Protected>}/>
<Route path="/lawyer-assigned-notices" element={<Protected role="lawyer"><LawyerAssignedNoticesPage/></Protected>}/>
<Route path="/lawyer-document-requests" element={<Protected role="lawyer"><LawyerDocumentRequestsPage/></Protected>}/>
<Route path="/lawyer-document-requests-display" element={<Protected role="lawyer"><LawyerDocumentRequestsDisplayPage/></Protected>}/>
<Route path="/lawyer-signed-uploads" element={<Protected role="lawyer"><SignedUploads/></Protected>}/>
<Route path="/lawyer-wallet" element={<Protected role="lawyer"><Wallet/></Protected>}/>
<Route path="/lawyer-withdrawal-requests" element={<Protected role="lawyer"><LawyerWithdrawalRequestsPage/></Protected>}/>
<Route path="/lawyer-profile" element={<Protected role="lawyer"><LawyerProfilePage/></Protected>}/>
<Route path="/admin-login" element={<AdminLogin/>}/>
<Route path="/client-login" element={<ClientLogin/>}/>
<Route path="/client-signup" element={<ClientRegister/>}/>
<Route path="/lawyer-login" element={<LawyerLogin/>}/>
<Route path="/lawyer-signup" element={<LawyerRegister/>}/>
<Route path="/client-payment-success" element={<PaymentResult/>}/>
<Route path="/client-payment-failure" element={<PaymentResult/>}/>
<Route path="/lawyer-drafts-display" element={<Navigate to="/lawyer-assigned-notices" replace/>}/>
<Route path="/lawyer-draft-review" element={<Navigate to="/lawyer-assigned-notices" replace/>}/>
<Route path="/lawyer-drafts-edit" element={<Navigate to="/lawyer-assigned-notices" replace/>}/>
<Route path="*" element={<main className="auth-panel"><h1>Page not found</h1><a href="/">Return home</a></main>}/>
</Routes></Suspense></BrowserRouter>}
