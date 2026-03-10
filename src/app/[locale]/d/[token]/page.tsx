import { DownloadPage } from "@/components/DownloadPage";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function DownloadRoute({ params }: Props) {
  const { token } = await params;
  return <DownloadPage token={token} />;
}
