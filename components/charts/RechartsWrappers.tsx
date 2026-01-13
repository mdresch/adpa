"use client"

import React from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

export function UsageLineChart({ data, providerStats, getProviderColor }: any) {
  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {providerStats.map((provider: any) => (
            <Line
              key={provider.provider_name}
              type="monotone"
              dataKey={provider.provider_name}
              stroke={getProviderColor(provider.provider_type)}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProviderBarChart({ data }: any) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="provider_name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="usage_count" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GenericBarChart({ data, xKey = 'name', dataKey = 'value', height = 240 }: any) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={dataKey} fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MultiBarChart({ data, xKey = 'name', bars = [{ key: 'value', fill: '#3B82F6' }], height = 240 }: any) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {bars.map((b: any, idx: number) => (
            <Bar key={idx} dataKey={b.key} fill={b.fill} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProviderPieChart({ data, getProviderColor, formatNumber }: any) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.map((p: any) => ({ ...p, total_tokens: parseInt(p.total_tokens) || 0 }))}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={(entry: any) => `${entry.provider_name} (${formatNumber(entry.total_tokens)})`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="total_tokens"
          >
            {data.map((provider: any, index: number) => (
              <Cell key={`cell-${index}`} fill={getProviderColor(provider.provider_type)} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => formatNumber(value)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ModelBarChart({ data, xKey = "model_name", dataKey = "usage_count", tickFormatter }: any) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} angle={-45} textAnchor="end" height={100} />
          <YAxis tickFormatter={tickFormatter} />
          <Tooltip />
          <Bar dataKey={dataKey} fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AreaChartWrapper({ data, xKey = 'name', dataKey = 'value' }: any) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          {Array.isArray(dataKey) ? (
            dataKey.map((dKey: any, idx: number) => (
              <Area key={idx} type="monotone" dataKey={dKey.key} stroke={dKey.stroke} fill={dKey.fill} fillOpacity={dKey.fillOpacity || 0.6} />
            ))
          ) : (
            <Area type="monotone" dataKey={dataKey} stroke="#8884d8" fill="#8884d8" />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GenericPieChart({ data, dataKey = 'value', colorKey = 'color', labelFormatter }: any) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey={dataKey} label={labelFormatter}>
            {data.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry[colorKey] || '#8884d8'} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SimpleLineChart({ data, lines = [{ key: 'value', color: '#3B82F6' }], xKey = 'name' }: any) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {lines.map((l: any, idx: number) => (
            <Line key={idx} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2} dot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CombinedAreaLineChart({ data, xKey = 'date', areas = [], lines = [] }: any) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {areas.map((a: any, idx: number) => (
            <Area key={`area-${idx}`} type={a.type || 'monotone'} dataKey={a.key} stroke={a.stroke} fill={a.fill} fillOpacity={a.fillOpacity ?? 0.6} name={a.name} />
          ))}
          {lines.map((l: any, idx: number) => (
            <Line key={`line-${idx}`} type={l.type || 'monotone'} dataKey={l.key} stroke={l.stroke} strokeWidth={l.strokeWidth || 2} strokeDasharray={l.strokeDasharray} dot={l.dot ?? false} name={l.name} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default null
