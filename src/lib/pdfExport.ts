import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { WeeklyReview, MonthlyReview } from '@/lib/reviews';
import type { Achievement } from '@/types';

const INK = '#18181B';
const ACCENT = '#3B82F6';

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(9, 9, 11);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(59, 130, 246);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PROGRESS//OS', 14, 15);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(title, 14, 24);
  doc.setTextColor(160, 160, 170);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, 14, 29);
  doc.setTextColor(20, 20, 20);
}

export function generateWeeklyReportPDF(review: WeeklyReview, achievements: Achievement[]) {
  const doc = new jsPDF();
  header(doc, `Weekly Review`, `${review.weekStart} — ${review.weekEnd}`);

  let y = 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Summary', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
    head: [['Metric', 'Value']],
    body: [
      ['Total Study Time', `${(review.totalStudyMin / 60).toFixed(1)} hours`],
      ['Average Daily Study', `${review.avgDailyStudyMin} min`],
      ['Best Day', review.bestDay ? `${review.bestDay.date} (${review.bestDay.min} min)` : '—'],
      ['Worst Day', review.worstDay ? `${review.worstDay.date} (${review.worstDay.min} min)` : '—'],
      ['Most Productive Subject', review.mostProductiveSubject?.name ?? '—'],
      ['Least Studied Subject', review.leastStudiedSubject?.name ?? '—'],
      ['Most Consistent Time Window', review.mostConsistentTime ?? '—'],
      ['Task Completion', `${review.completionPct}%`],
      ['Streak at Week End', `${review.streakAtWeekEnd} days`],
      ['XP Earned', `${review.xpEarned}`],
      ['Level Progress', `${review.levelStart} → ${review.levelEnd}`],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Suggestions', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const s of review.suggestions) {
    const lines = doc.splitTextToSize(`• ${s}`, 180);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 2;
  }

  if (achievements.length) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Achievements Unlocked This Week', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9 },
      head: [['Achievement', 'Unlocked']],
      body: achievements.map((a) => [a.title, a.unlockedAt ? new Date(a.unlockedAt).toLocaleDateString() : '']),
    });
  }

  doc.save(`weekly-review-${review.weekStart}.pdf`);
}

export function generateMonthlyReportPDF(review: MonthlyReview, achievements: Achievement[]) {
  const doc = new jsPDF();
  header(doc, `Monthly Review`, review.monthLabel);

  let y = 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Summary', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [168, 85, 247] },
    head: [['Metric', 'Value']],
    body: [
      ['Total Hours', review.totalHours.toFixed(1)],
      ['Average Hours / Day', review.avgHoursPerDay.toFixed(2)],
      ['Strongest Subject', review.strongestSubject ?? '—'],
      ['Weakest Subject', review.weakestSubject ?? '—'],
      ['Longest Streak', `${review.longestStreak} days`],
      ['Missed Days', `${review.missedDays}`],
      ['Most Productive Week', `${review.mostProductiveWeekLabel} (${review.mostProductiveWeekHours.toFixed(1)}h)`],
      ['XP Earned', `${review.xpEarned}`],
      [
        'Change vs Previous Month',
        review.improvementPct === null ? 'No prior data' : `${review.improvementPct >= 0 ? '+' : ''}${review.improvementPct.toFixed(1)}%`,
      ],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Subjects Ranked by Time Invested', 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 9 },
    head: [['Subject', 'Hours']],
    body: review.subjectsRanked.map((s) => [s.name, s.hours.toFixed(1)]),
  });

  if (achievements.length) {
    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Achievements Unlocked This Month', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9 },
      head: [['Achievement', 'Unlocked']],
      body: achievements.map((a) => [a.title, a.unlockedAt ? new Date(a.unlockedAt).toLocaleDateString() : '']),
    });
  }

  doc.save(`monthly-review-${review.monthLabel.replace(' ', '-')}.pdf`);
}

export function generateStatsReportPDF(stats: Record<string, string | number>, achievements: Achievement[]) {
  const doc = new jsPDF();
  header(doc, 'Statistics Report', new Date().toLocaleDateString());

  autoTable(doc, {
    startY: 42,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [57, 255, 136], textColor: [10, 10, 10] },
    head: [['Statistic', 'Value']],
    body: Object.entries(stats).map(([k, v]) => [k, String(v)]),
  });

  let y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Achievements Unlocked', 14, y);
  y += 4;
  const unlocked = achievements.filter((a) => a.unlockedAt);
  autoTable(doc, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 9 },
    head: [['Achievement', 'Unlocked']],
    body: unlocked.length ? unlocked.map((a) => [a.title, new Date(a.unlockedAt!).toLocaleDateString()]) : [['None yet', '']],
  });

  doc.save(`stats-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
