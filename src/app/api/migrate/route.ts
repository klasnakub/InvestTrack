import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('Adding exchange_rate to transactions...');
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15, 6)`;
    
    console.log('Adding current_exchange_rate to portfolios...');
    await sql`ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS current_exchange_rate NUMERIC(15, 6) DEFAULT 1.0`;
    
    return NextResponse.json({ message: "Migration successful" });
  } catch (error: any) {
    console.error('Error updating schema:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
