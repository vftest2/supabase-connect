import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { ptBR } from 'date-fns/locale';

interface UpcomingCalendarProps {
  eventDates: Date[];
}

export function UpcomingCalendar({ eventDates }: UpcomingCalendarProps) {
  const [month, setMonth] = useState(new Date());

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Calendário</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          locale={ptBR}
          month={month}
          onMonthChange={setMonth}
          modifiers={{ event: eventDates }}
          modifiersClassNames={{
            event: 'bg-primary/20 text-primary font-bold',
          }}
        />
      </CardContent>
    </Card>
  );
}
