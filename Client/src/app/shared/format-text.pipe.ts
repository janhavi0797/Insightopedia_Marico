import { Pipe, PipeTransform } from '@angular/core';


@Pipe({
  name: 'formatText'
})
export class FormatTextPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

  //   // Remove Markdown symbols (### and **)
  //   value = value.replace(/### /g, '<h1>').replace(/\*\*(.*?)\*\*/g, '<h2>$1</h2>');

  //   // Convert list items to paragraphs
  //   value = value.replace(/\d+\.\s/g, '<p>');

  //   // Close unclosed `<h1>` tags properly
  //  value = value.replace(/<h1>(.*?)\n/g, '<h1>$1</h1>');
  // // Convert headings (Household Items: -) into proper format
  // value = value.replace(/\s*:-\s*/g, ' • ');

  // // Convert list items (-, •) into inline paragraphs
  // value = value.replace(/\n\s*[-•]\s*(.*)/g, ' <p>$1</p>');

  const containsMarkdown = /###|(\*\*.*?\*\*)/.test(value);

  // Convert headings only if markdown is present
  if (!containsMarkdown) {
 // Ensure proper sentence-based bullet points
 value = value.replace(/([^.?!]+[.?!])\s*/g, '<p>• $1</p>\n');
  }
   // Remove Markdown symbols (### -> <h1> and ** -> <h2>)
   value = value.replace(/###\s*(.*)/g, '<h1>$1</h1>');
   value = value.replace(/\*\*(.*?)\*\*/g, '<h2>$1</h2>');

   // Convert bullet points and numbered lists into paragraph tags
   value = value.replace(/\n\s*\d+\.\s*(.*)/g, '<p>$1</p>'); // Numbered lists
   value = value.replace(/\n\s*[-•]\s*(.*)/g, '<p>$1</p>'); // Bullet points

   // Fix headings followed by colons so they don't break lines
   value = value.replace(/<h2>(.*?)\s*:\s*<\/h2>/g, '<h2>$1</h2>'); // Removes colons inside headings

      // Remove colons (:) from paragraphs
      value = value.replace(/<p>(.*?)\s*:\s*<\/p>/g, '<p>$1</p>');
    // Remove all colons (:) from the text ********
     // value = value.replace(/:/g, '');

     // Remove all occurrences of #, *, and :
value = value.replace(/[#*:]/g, '');

   // Remove multiple new lines to prevent extra spacing
   value = value.replace(/\n{2,}/g, '\n');

    return value.trim();



    //return value;
  }

}
