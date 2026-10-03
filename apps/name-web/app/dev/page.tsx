import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const { default: DevApp } = await import("../../components/DevApp");
  return <DevApp />;
}
