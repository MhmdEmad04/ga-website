import { notificationReadiness,orderNotifications } from '@/lib/server/notifications';
import {NotificationRetry}from'./notification-retry';
export async function NotificationStatus({orderId}:{orderId:string}){
  const notifications=await orderNotifications(orderId);const readiness=notificationReadiness();
  const labels={pending:'بانتظار الإرسال',sending:'جاري الإرسال',sent:'تم قبول الإشعار',failed:'تعذّر الإرسال'};
  return <section className="admin-panel"><h2>إشعارات الطلب</h2>{!notifications.length?<p>لا توجد إشعارات مسجلة لهذا الطلب.</p>:notifications.map((item)=><div key={item.channel} className="notification-status"><strong>{item.channel==='telegram'?'تيليجرام':'واتساب'} — {labels[item.status]}</strong><p>عدد المحاولات: {item.attempts}</p>{item.status!=='sent'&&!readiness.find((channel)=>channel.channel===item.channel)?.ready&&<p>القناة غير مفعلة. أضف إعدادات الإرسال على السيرفر لتوصيل الإشعارات المنتظرة.</p>}{item.last_error&&<p className="form-message">{item.last_error}</p>}{item.status==='failed'&&<NotificationRetry orderId={orderId} channel={item.channel}/>} {item.sent_at&&<small>{new Date(item.sent_at).toLocaleString('ar-EG',{timeZone:'Africa/Cairo'})}</small>}</div>)}</section>;
}
