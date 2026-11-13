import { CheckinForm } from "../CheckinForm";

export const metadata = { title: "Check-in" };

// Link ini bisa dijadikan QR code yang ditempel di pintu ruangan: /checkin/RD1-TOBA
export default async function CheckinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <CheckinForm initialCode={decodeURIComponent(code)} auto />;
}
