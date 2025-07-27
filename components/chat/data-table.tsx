"use client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps {
  data: Record<string, any>[]
  title?: string
}

export function DataTable({ data, title = "Detailed Data" }: DataTableProps) {
  if (!data || data.length === 0) return null

  const headers = Object.keys(data[0])

  return (
    <div className="mt-2">
      <h4 className="text-sm font-medium text-teal-200 mb-2">{title}</h4>
      <div className="max-h-60 overflow-y-auto custom-scrollbar border border-neutral-700/50 rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              {headers.map((header) => (
                <TableHead key={header} className="text-neutral-400 text-xs capitalize h-8">
                  {header.replace(/_/g, " ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex} className="border-neutral-800">
                {headers.map((header) => (
                  <TableCell key={`${rowIndex}-${header}`} className="text-xs font-mono text-white py-2">
                    {String(row[header])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}