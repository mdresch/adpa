import { NextResponse } from "next/server"
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-utils"
import { connectDatabase, pool } from "@/server/src/database/connection"
import { logger } from "@/server/src/utils/logger"

import { stringify } from "csv-stringify/sync"
import ExcelJS from "exceljs"
import PDFDocument from "pdfkit"

type ExportFormat = "csv" | "excel" | "pdf"

type CriterionScore = {
  criterion: string
  score: number
  weight: string | number
  weighted_score: string | number
}

type RankingRow = {
  rank: number
  project_id: string
  project_name: string
  total_score: string | number
  criteria_scored: number
  last_scored_at: string | null
  status: string | null
  budget: number | null
  start_date: string | null
  end_date: string | null
  criterion_scores: CriterionScore[] | null
}

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()

  await connectDatabase()

  try {
    const { searchParams } = new URL(req.url)
    const format = ((searchParams.get("format") || "csv").toLowerCase() as ExportFormat) ?? "csv"

    if (!["csv", "excel", "pdf"].includes(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 })
    }

    const rankings = await pool.query<RankingRow>(
      `
      SELECT
        pr.rank,
        pr.project_id,
        pr.project_name,
        pr.total_score,
        pr.criteria_scored,
        pr.last_scored_at,
        p.status,
        p.budget,
        p.start_date,
        p.end_date,
        json_agg(
          json_build_object(
            'criterion', pc.name,
            'score', ps.score,
            'weight', pc.weight,
            'weighted_score', (ps.score * pc.weight)
          ) ORDER BY pc.name
        ) FILTER (WHERE pc.id IS NOT NULL) as criterion_scores
      FROM public.portfolio_rankings pr
      JOIN public.projects p ON pr.project_id = p.id
      LEFT JOIN public.portfolio_scores ps ON pr.project_id = ps.project_id
      LEFT JOIN public.portfolio_criteria pc ON ps.criterion_id = pc.id AND pc.is_active = true
      GROUP BY
        pr.rank, pr.project_id, pr.project_name, pr.total_score, pr.criteria_scored, pr.last_scored_at,
        p.status, p.budget, p.start_date, p.end_date
      ORDER BY pr.rank ASC
      `
    )

    const rows = rankings.rows

    if (format === "csv") return exportCSV(rows)
    if (format === "excel") return await exportExcel(rows)
    return await exportPDF(rows)
  } catch (error) {
    logger.error("GET /api/portfolio/rankings/export failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function exportCSV(rankings: RankingRow[]) {
  const csvData = rankings.map((r) => ({
    Rank: r.rank,
    "Project Name": r.project_name,
    "Total Score": Number(r.total_score).toFixed(2),
    "Criteria Scored": r.criteria_scored,
    Status: r.status ?? "",
    Budget: r.budget ?? "",
    "Start Date": r.start_date ?? "",
    "End Date": r.end_date ?? "",
    "Last Scored": r.last_scored_at ? new Date(r.last_scored_at).toLocaleDateString() : "",
  }))

  const csv = stringify(csvData, { header: true })
  const filename = `portfolio-rankings-${Date.now()}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    },
  })
}

async function exportExcel(rankings: RankingRow[]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Portfolio Rankings")

  worksheet.mergeCells("A1:H1")
  worksheet.getCell("A1").value = "Portfolio Prioritization Rankings"
  worksheet.getCell("A1").font = { size: 16, bold: true }
  worksheet.getCell("A1").alignment = { horizontal: "center" }

  worksheet.mergeCells("A2:H2")
  worksheet.getCell("A2").value = `Generated: ${new Date().toLocaleString()}`
  worksheet.getCell("A2").alignment = { horizontal: "center" }

  worksheet.addRow([])
  const headerRow = worksheet.addRow([
    "Rank",
    "Project Name",
    "Total Score",
    "Criteria Scored",
    "Status",
    "Budget",
    "Start Date",
    "End Date",
  ])
  headerRow.font = { bold: true }
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }

  for (const r of rankings) {
    const row = worksheet.addRow([
      r.rank,
      r.project_name,
      Number(r.total_score),
      r.criteria_scored,
      r.status ?? "",
      r.budget ?? "",
      r.start_date ?? "",
      r.end_date ?? "",
    ])

    if (r.rank <= 3) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3B0" } }
    }
  }

  worksheet.columns.forEach((c) => {
    c.width = Math.max(14, (c.header?.toString().length || 14) + 2)
  })

  const detailSheet = workbook.addWorksheet("Detailed Scores")
  const detailHeader = detailSheet.addRow(["Project", "Criterion", "Score", "Weight", "Weighted Score"])
  detailHeader.font = { bold: true }

  for (const r of rankings) {
    for (const cs of r.criterion_scores || []) {
      detailSheet.addRow([
        r.project_name,
        cs.criterion,
        cs.score,
        Number(cs.weight),
        Number(cs.weighted_score).toFixed(2),
      ])
    }
  }

  detailSheet.columns.forEach((c) => {
    c.width = Math.max(14, (c.header?.toString().length || 14) + 2)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `portfolio-rankings-${Date.now()}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    },
  })
}

async function exportPDF(rankings: RankingRow[]) {
  const doc = new PDFDocument({ margin: 40 })
  const chunks: Buffer[] = []

  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)))

  doc.fontSize(18).text("Portfolio Prioritization Rankings", { align: "center" })
  doc.moveDown(0.5)
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: "center" })
  doc.moveDown(1.5)

  rankings.forEach((r, idx) => {
    if (idx > 0 && idx % 18 === 0) doc.addPage()
    doc.fontSize(12).text(`${r.rank}. ${r.project_name}`, { underline: true })
    doc
      .fontSize(10)
      .text(`Total Score: ${Number(r.total_score).toFixed(2)}`)
      .text(`Status: ${r.status ?? "—"}`)
      .text(`Budget: ${r.budget != null ? `$${Number(r.budget).toLocaleString()}` : "—"}`)
      .text(`Last Scored: ${r.last_scored_at ? new Date(r.last_scored_at).toLocaleDateString() : "—"}`)
    doc.moveDown(0.8)
  })

  doc.end()

  const buffer = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  })

  const filename = `portfolio-rankings-${Date.now()}.pdf`
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    },
  })
}

