/**
 * Carrega os scripts da UESP no contexto global do Node.js via vm.runInThisContext.
 *
 * Por que vm.runInThisContext e não require()?
 * - Os scripts da UESP não exportam módulos: definem funções e variáveis em window.*.
 * - require() registra o módulo no cache e isola o escopo — as funções UESP não
 *   ficariam visíveis como globais.
 * - vm.runInThisContext executa o código JS no contexto global REAL do processo Node,
 *   garantindo que window.GetEsoInputValues, window.UpdateEsoComputedStatsList_Real, etc.,
 *   fiquem disponíveis como globais acessíveis por qualquer módulo.
 *
 * IMPORTANTE: setupNodeEnvironment() deve ser chamado ANTES desta função.
 */
import type { UespInitData } from './types';
/**
 * Carrega e inicializa o motor da UESP.
 *
 * @param uespResourcesPath - Caminho para a pasta resources/ do fork da UESP.
 *   Ex: path.resolve(__dirname, '../../../vendor/uesp-esochardata/resources')
 * @param initData
 *   Ex: path.resolve(__dirname, '../../../vendor/uesp-data/uesp-init-data.json')
 */
export declare function loadUespEngine(uespResourcesPath: string, initData: string | UespInitData): void;
/** Permite recarregar o motor (útil em testes) */
export declare function resetEngineLoader(): void;
//# sourceMappingURL=loader.d.ts.map