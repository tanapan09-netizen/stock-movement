import { getPettyCashRequestById } from "@/actions/pettyCashActions";
import { notFound } from "next/navigation";
import PettyCashPrintClient from "./PettyCashPrintClient";
import { auth } from "@/auth";

export default async function PettyCashPrintPage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session || !session.user) {
        return <div className="p-8 text-center text-xl text-red-500">กรุณาเข้าสู่ระบบก่อนใช้งาน</div>;
    }

    const { id } = params;
    const reqRes = await getPettyCashRequestById(Number(id));

    if (!reqRes.success || !reqRes.data) {
        return notFound();
    }

    return (
        <PettyCashPrintClient
            data={reqRes.data}
            currentUserRole={(session.user as any).role || 'employee'}
        />
    );
}
