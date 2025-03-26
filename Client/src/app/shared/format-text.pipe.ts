import { Pipe, PipeTransform } from '@angular/core';


@Pipe({
  name: 'formatText'
})
export class FormatTextPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    // Convert ### Headings into <h3> with spacing
    value = value.replace(/^###\s*(.*)$/gm, '<h3 class="formatted-heading">$1</h3>');

    // Remove unnecessary numbering (e.g., "1. " at the start of lines)
    value = value.replace(/^\d+\.\s+/gm, '');

    // Convert **bold text** into <p><b>...</b></p> to ensure it's on a new line
    value = value.replace(/\*\*(.*?)\*\*/g, '<p class="formatted-title"><b>$1</b></p>');

    // Remove excessive line breaks (only keep one between lines)
    value = value.replace(/(\s*<br>\s*)+/g, '<br>');

    return value.trim();
  }
}
