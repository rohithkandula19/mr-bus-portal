export function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    // Handle MM-DD-YYYY HH:MM format
    let d;
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}/)) {
      const [datePart, timePart] = dateStr.split(' ');
      const [mm, dd, yyyy] = datePart.split('-');
      d = new Date(`${yyyy}-${mm}-${dd}T${timePart || '00:00'}:00`);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d)) return dateStr;
    const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${date} • ${time}`;
  } catch {
    return dateStr;
  }
}

export function formatTime(dateStr) {
  if (!dateStr) return "N/A";
  try {
    let d;
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}/)) {
      const [datePart, timePart] = dateStr.split(' ');
      const [mm, dd, yyyy] = datePart.split('-');
      d = new Date(`${yyyy}-${mm}-${dd}T${timePart || '00:00'}:00`);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d)) return dateStr;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return dateStr;
  }
}

export default formatDate;
