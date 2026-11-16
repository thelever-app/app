import { describe, expect, it } from 'vitest';
import { html } from '../html.ts';

describe('html', () => {
  it('should escape the text it is given, so a dilemma cannot add markup to its page', () => {
    // Act
    const page = html`<p title="${'"a" & <b>'}">${"<script>alert('x')</script>"}</p>`;

    // Assert
    expect(page.value).toBe(
      '<p title="&quot;a&quot; &amp; &lt;b&gt;">&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;</p>',
    );
  });

  it('should keep the markup of the pieces it is given, and join lists of them', () => {
    // Act
    // prettier-ignore
    const page = html`<ul>${['a', 'b'].map((item) => html`<li>${item}</li>`)}</ul>${html`<br>`}`;

    // Assert
    expect(page.value).toBe('<ul><li>a</li><li>b</li></ul><br>');
  });

  it('should leave out what is missing or false', () => {
    // Act
    const page = html`<p>${undefined}${false}${null}${0}</p>`;

    // Assert
    expect(page.value).toBe('<p>0</p>');
  });
});
