/**
 * Configura o ambiente global do Node.js para simular o browser.
 *
 * O motor da UESP (esoEditBuild.js) foi escrito para rodar no browser e usa:
 *   - window.* — para variáveis e funções globais
 *   - document.getElementById / $ — para ler/escrever valores do DOM
 *   - navigator — verificação de agente
 *
 * Esta camada cria mocks controlados desses objetos ANTES de carregar
 * o script da UESP, de forma que:
 *   1. O script inicia sem erros (jQuery mock chainável)
 *   2. Nosso código pode injetar valores de entrada (race, class, level, etc.)
 *      via setDomValue() antes de chamar o cálculo
 *   3. O motor lê esses valores normalmente via $("#elementId").val()
 */
/** Define o valor de um elemento mock (equivale a preencher um campo HTML) */
export declare function setDomValue(id: string, value: string): void;
/** Define um atributo HTML de um elemento mock */
export declare function setDomAttr(id: string, attr: string, value: string): void;
/** Define o textContent de um elemento mock */
export declare function setDomTextContent(id: string, text: string): void;
/** Reseta todos os valores do DOM mock */
export declare function resetDomValues(): void;
export declare function setupNodeEnvironment(): void;
//# sourceMappingURL=env-setup.d.ts.map