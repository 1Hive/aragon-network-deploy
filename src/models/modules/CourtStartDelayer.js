const BaseDeployer = require('./BaseDeployer')
const CallsEncoder = require('../CallsEncoder')
const logger = require('../../helpers/logger')('CourtStartDelayer')

module.exports = class extends BaseDeployer {
  constructor(config, environment, output) {
    super(environment, output, undefined, logger)
    this.config = config
    this.encoder = new CallsEncoder()
  }

  async call() {
    (typeof this.config.governor.modules === 'string')
      ? (await this.delayCourtStart())
      : (await this.delayCourtStartThroughDAO())
  }

  async delayCourtStart() {
    const { modules: { court }, clock: { firstTermStartTime } } = this.config
    logger.info('Delaying Court start time...')
    const AragonCourt = await this.environment.getArtifact('AragonCourt', '@aragon/court')
    const controller = await AragonCourt.at(court)
    await controller.delayStartTime(firstTermStartTime)
    logger.success('Court start time delayed successfully')
  }

  async delayCourtStartThroughDAO() {
    logger.info('Building EVM script to delay Court start time...')
    const { governor: { config: dao }, modules: { court }, clock: { firstTermStartTime } } = this.config
    const delayData = this.encoder.encodeDelayStartTime(firstTermStartTime)
    const executeData = this.encoder.encodeExecute(court, 0, delayData)
    const agentCallsScript = [{ to: dao.agent, data: executeData }]
    await this._encodeAndSubmitEvmScript(dao, agentCallsScript, 'Delay Court start time')
  }
}
