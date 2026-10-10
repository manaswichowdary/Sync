import { NextResponse } from "next/server";
import demo from "@/data/demo.json";
import { matchPosts } from "@/lib/matching";
import type { Board, Post } from "@/lib/types";

const BOARDS: Board[] = ["help", "share", "gather", "street"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const board: Board = BOARDS.includes(body?.board) ? body.board : "gather";
  const kidsAges: number[] = Array.isArray(body?.kidsAges)
    ? body.kidsAges.filter((n: unknown) => typeof n === "number" && n >= 0 && n < 19)
    : [];
  const times: string[] = Array.isArray(body?.times)
    ? body.times.filter((t: unknown) => typeof t === "string")
    : [];
  const publicOnly = body?.publicOnly !== false;

  // Demo data for now. Swap this for a database query when Supabase is connected.
  const matches = matchPosts(
    { board, kidsAges, times, publicOnly },
    demo.posts as Post[]
  );

  return NextResponse.json({ matches });
}
