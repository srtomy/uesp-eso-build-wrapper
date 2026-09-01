import { afterEach, describe, expect, it } from 'vitest';
import {
  resetDomValues,
  setDomAttr,
  setDomTextContent,
  setDomValue,
  setupNodeEnvironment,
} from '../src/lib/eso-engine/env-setup';

afterEach(() => {
  resetDomValues();
});

describe('Node environment mock', () => {
  it('stores values, attributes and text independently', () => {
    setupNodeEnvironment();
    setDomValue('field', 'value');
    setDomAttr('node', 'unlocked', '1');
    setDomTextContent('description', 'Current bonus: 10');

    expect((global as any).$('#field').val()).toBe('value');
    expect((global as any).$('#node').attr('unlocked')).toBe('1');
    expect((global as any).$('#description').text()).toBe('Current bonus: 10');
  });

  it('supports checkbox values and resets all stores', () => {
    setupNodeEnvironment();
    setDomValue('enabled', 'true');
    expect((global as any).$('#enabled').prop('checked')).toBe(true);

    resetDomValues();
    expect((global as any).$('#enabled').prop('checked')).toBe(false);
    expect((global as any).$('#enabled').val()).toBe('');
  });

  it('keeps jQuery chains usable for common operations', () => {
    setupNodeEnvironment();
    const chain = (global as any).$('#field');

    expect(chain.find('.child').parent().closest('.row').length).toBe(1);
    expect(chain.addClass('active').removeClass('active').toggleClass('active')).toBeTruthy();
    expect(chain.hasClass('active')).toBe(false);
    expect(chain.css('display')).toBe('');
    expect(chain.width()).toBe(0);
    expect(chain.get()).toBeNull();
    expect(chain.index()).toBe(-1);
  });

  it('exposes the supported static jQuery helpers', () => {
    setupNodeEnvironment();
    const $ = (global as any).$;

    expect($.isEmptyObject({})).toBe(true);
    expect($.isEmptyObject({ value: 1 })).toBe(false);
    expect($.extend({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    expect($.trim('  text ')).toBe('text');
    expect($.type(1)).toBe('number');
    expect($.parseJSON('{"ok":true}')).toEqual({ ok: true });
    expect($.noop()).toBeUndefined();
  });

  it('is safe to initialize repeatedly and proxies window to global', () => {
    setupNodeEnvironment();
    setupNodeEnvironment();

    (global as any).window.__envSetupMarker = 'ok';
    expect((global as any).__envSetupMarker).toBe('ok');
    expect((global as any).window.navigator).toBe((global as any).navigator);
    expect((global as any).document.getElementById('missing').value).toBe('');
  });
});
