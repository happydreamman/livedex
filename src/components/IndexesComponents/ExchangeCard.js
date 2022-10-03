import { useEffect, useState } from 'react';
import { loadContract, getPriceCoin } from "../../utils/index";
import { useToasts } from 'react-toast-notifications';
import { useWeb3React } from '@web3-react/core';
import OneInchAbi from "../../constants/1inchfarm.json";
import MooniSwapAbi from "../../constants/mooniswap.json";
import ModalConnect from '../GeneralComponents/ModalConnect';
import PairSushiAbi from '../../constants/abis/pair_sushi.json';
import Pair1inchAbi from '../../constants/abis/1inch_pair.json';
import MasterchefAbi from '../../constants/abis/Masterchef.json';
import MasterchefDinoAbi from '../../constants/abis/masterchef_dino.json';
import { _1inch_url, sushi_url, dino_url, quick_url, sushi_farm_address, dino_farm_address } from '../../constants';


function ExchangeCard(props) {
  const [show, setShow] = useState(false);
  const { account, active, chainId, library } = useWeb3React();
  const [balance, setBalance] = useState(0);
  const [Staked, setStaked] = useState(0);
  const [Reward, setReward] = useState(0);
  const [StakedPerc, setStakedPerc] = useState(0);
  const [WithdrawPerc, setWithdrawPerc] = useState(0);
  const [rewardRate, setrewardRate] = useState(0);
  const { addToast } = useToasts();
  const [status, setStatus] = useState(true);

  useEffect(() => {
    if (props.data === "connect") {
      setStatus(false);
    } else {
      setStatus(true);
    }
  }, [props]);


  function showconnect() {
    setShow(true);
  }

  // *** Switch Chain
  const switchChain = async (chain_id) => {
    const win = window;
    if (win.ethereum && chainId !== chain_id) {
      try {
        await win.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + chain_id.toString(16) }],
        })
        return true; 
      } catch (switchError) {
        return false;
      }
    }
    return true; 
  }
  // ***

  async function handleWrite(c, name, ...args) {
    try {
      c.methods[name](...args).send({ from: account }).on('receipt', (receipt) => {
        addToast("Transaction Confirmed", {
          appearance: 'success',
          autoDismiss: true,
        })
      }).on('transactionHash', (hash) => {
        addToast("Transaction Created : " + hash, {
          appearance: 'success',
          autoDismiss: true,
        })
      }).on('error', (err) => {
        addToast('Transaction Failed', {
          appearance: 'error',
          autoDismiss: true,
        })
      }).then((resp) => console.log(resp))
    } catch (e) {
      addToast(e, {
        appearance: 'error',
        autoDismiss: true,
      })
    }

  }

  async function getData() {
    if (props.data.farm === '1Inch') {
      let result = await switchChain(1)
      if (result) {
        let OneInch = loadContract(library, OneInchAbi, props.data.data.address);
        let mooniAddress = await OneInch.methods.mooniswap().call();
        let MooniSwap = loadContract(library, MooniSwapAbi, mooniAddress)
        let bal = await MooniSwap.methods.balanceOf(account).call();
        setBalance(bal);
        let stak = await OneInch.methods.balanceOf(account).call();
        setStaked(stak);
        let reward_rate = await getPriceCoin(props.data.data.rewardToken.id);
        setrewardRate(reward_rate);
        let earn = await OneInch.methods.earned(props.data.data.rewardToken['1inch_id'], account).call();
        setReward(earn);
      }
    } else if (props.data.farm === 'Sushi') {
      let result = await switchChain(1)
      if (result) {
        let sushiContract = loadContract(library, PairSushiAbi, props.data.data.address);
        let balance = await sushiContract.methods.balanceOf(account).call();
        setBalance(balance);
        //*** Get Stake
        let sushiFarmContract = loadContract(library, MasterchefAbi, sushi_farm_address);
        let staked = await sushiFarmContract.methods.userInfo(props.data.pid, account).call();
        setStaked(staked.amount);
        //*** Get Reward
        let earn = await sushiFarmContract.methods.pendingSushi(props.data.pid, account).call();
        setReward(earn);
      }
    } else if (props.data.farm === 'Dino') {
      let result = await switchChain(137)
      if (result) {
        let dinoContract = loadContract(library, PairSushiAbi, props.data.data.address);
        let balance = await dinoContract.methods.balanceOf(account).call();
        setBalance(balance.toString());
        //*** Get Stake
        let dinoFarmContract = loadContract(library, MasterchefDinoAbi, dino_farm_address);
        let staked = await dinoFarmContract.methods.userInfo(props.data.pid, account).call();
        setStaked(staked.amount);
        //*** Get Reward
        let earn = await dinoFarmContract.methods.pendingDino(props.data.pid, account).call();
        setReward(earn);
      }
    }
  }

  function handleInpChange(e) {
    let target = e.target;
    let val = target.value;
    let id = target.id;
    switch (id) {
      case "balance":
        setStakedPerc(Number(val));
        break;
      case "staked":
        setWithdrawPerc(Number(val));
        break;
      default:
    }
  }

  async function Stake() {
    
    let stake_amount = ((StakedPerc / 100) * balance);
    if (props.data.farm === '1Inch') {
      let result = await switchChain(1)
      if (result) {
        if (balance === 0) {
          addToast('Your Balance is 0', {
            appearance: 'error',
            autoDismiss: true,
          })
          return
        }
        try {
          let OneInchPair = loadContract(library, Pair1inchAbi, props.data.pair_id);
          let approved_value = await OneInchPair.methods.allowance(account, props.data.data.address).call();
          if (approved_value < stake_amount) {
            OneInchPair.methods["approve"](props.data.data.address, stake_amount.toFixed(0)).send({ from: account }).on('receipt', async (receipt) => {
              addToast("Transaction Confirmed", {
                appearance: 'success',
                autoDismiss: true,
              })
              let OneInch = loadContract(library, OneInchAbi, props.data.data.address);
              await handleWrite(OneInch, "stake", stake_amount.toFixed(0));
            }).on('transactionHash', (hash) => {
              addToast("Transaction Created : " + hash, {
                appearance: 'success',
                autoDismiss: true,
              })
            }).on('error', (err) => {
              addToast('Transaction Failed', {
                appearance: 'error',
                autoDismiss: true,
              })
            }).then((resp) => console.log(resp))
          } else {
            let OneInch = loadContract(library, OneInchAbi, props.data.data.address);
            await handleWrite(OneInch, "stake", stake_amount.toFixed(0));
          }
        } catch (e) {
          addToast(e, {
            appearance: 'error',
            autoDismiss: true,
          })
        }

      }
    } else if (props.data.farm === 'Sushi') {
      let result = await switchChain(1)
      if (result) {
        if (balance === 0) {
          addToast('Your Balance is 0', {
            appearance: 'error',
            autoDismiss: true,
          })
          return
        }
        try {
          let SushiPairContract = loadContract(library, PairSushiAbi, props.data.data.address);
          let approved_value = await SushiPairContract.methods.allowance(account, sushi_farm_address).call();
          if (approved_value < stake_amount) {
            SushiPairContract.methods["approve"](sushi_farm_address, stake_amount.toFixed(0)).send({ from: account }).on('receipt', async (receipt) => {
              addToast("Transaction Confirmed", {
                appearance: 'success',
                autoDismiss: true,
              })
              let sushiFarmContract = loadContract(library, MasterchefAbi, sushi_farm_address);
              await handleWrite(sushiFarmContract, "deposit", props.data.pid, stake_amount.toFixed(0));
            }).on('transactionHash', (hash) => {
              addToast("Transaction Created : " + hash, {
                appearance: 'success',
                autoDismiss: true,
              })
            }).on('error', (err) => {
              addToast('Transaction Failed', {
                appearance: 'error',
                autoDismiss: true,
              })
            }).then((resp) => console.log(resp))
          } else {
            let sushiFarmContract = loadContract(library, MasterchefAbi, sushi_farm_address);
            await handleWrite(sushiFarmContract, "deposit", props.data.pid, stake_amount.toFixed(0));
          }
        } catch (e) {
          addToast(e, {
            appearance: 'error',
            autoDismiss: true,
          })
        }
        
      }
    } else if (props.data.farm === 'Dino') {
      let result = await switchChain(137)
      if (result) {
        if (balance === 0) {
          addToast('Your Balance is 0', {
            appearance: 'error',
            autoDismiss: true,
          })
          return
        }
        try {
          let DinoPairContract = loadContract(library, PairSushiAbi, props.data.data.address);
          let approved_value = await DinoPairContract.methods.allowance(account, dino_farm_address).call();
          if (approved_value < stake_amount) {
            DinoPairContract.methods["approve"](dino_farm_address, stake_amount.toFixed(0)).send({ from: account }).on('receipt', async (receipt) => {
              addToast("Transaction Confirmed", {
                appearance: 'success',
                autoDismiss: true,
              })
              let dinoFarmContract = loadContract(library, MasterchefDinoAbi, dino_farm_address);
              await handleWrite(dinoFarmContract, "deposit", props.data.pid, stake_amount.toFixed(0));
            }).on('transactionHash', (hash) => {
              addToast("Transaction Created : " + hash, {
                appearance: 'success',
                autoDismiss: true,
              })
            }).on('error', (err) => {
              addToast('Transaction Failed', {
                appearance: 'error',
                autoDismiss: true,
              })
            }).then((resp) => console.log(resp))
          } else {
            let dinoFarmContract = loadContract(library, MasterchefDinoAbi, dino_farm_address);
            await handleWrite(dinoFarmContract, "deposit", props.data.pid, stake_amount.toFixed(0));
          }
        } catch (e) {
          addToast(e, {
            appearance: 'error',
            autoDismiss: true,
          })
        }
        
      }
    }
  }

  async function Unstake() {
    
    let withdraw_amount = ((WithdrawPerc / 100) * Staked);
    console.log("withdraw_amount", withdraw_amount)
    if (props.data.farm === '1Inch') {
      let result = await switchChain(1)
      if (result) {
        if (Staked === 0) {
          addToast('Your Staked Balance is 0', {
            appearance: 'error',
            autoDismiss: true,
          })
          return
        }
        let OneInch = loadContract(library, OneInchAbi, props.data.data.address);
        await handleWrite(OneInch, "withdraw", withdraw_amount.toFixed(0));
      }
    } else if (props.data.farm === 'Sushi') {
      let result = await switchChain(1)
      if (result) {
        if (Staked === 0) {
          addToast('Your Staked Balance is 0', {
            appearance: 'error',
            autoDismiss: true,
          })
          return
        }
        let sushiFarmContract = loadContract(library, MasterchefAbi, sushi_farm_address);
        await handleWrite(sushiFarmContract, "withdraw", props.data.pid, withdraw_amount.toFixed(0));
      }
    } else if (props.data.farm === 'Dino') {
      let result = await switchChain(137)
      if (result) {
        if (Staked === 0) {
          addToast('Your Staked Balance is 0', {
            appearance: 'error',
            autoDismiss: true,
          })
          return
        }
        let dinoFarmContract = loadContract(library, MasterchefDinoAbi, dino_farm_address);
        await handleWrite(dinoFarmContract, "withdraw", props.data.pid, withdraw_amount.toFixed(0));
      }
    }
  }

  async function Claim() {
    if (props.data.farm === '1Inch') {
      let result = await switchChain(1)
      if (result) {
        let OneInch = loadContract(library, OneInchAbi, props.data.data.address);
        await handleWrite(OneInch, "getAllRewards");
      }
    } else if (props.data.farm === 'Sushi') {
      let result = await switchChain(1)
      if (result) {
        console.log("1. Sushi")
        let sushiFarmContract = loadContract(library, MasterchefAbi, sushi_farm_address);
        await handleWrite(sushiFarmContract, "deposit", props.data.pid, 0);
      }
    } else if (props.data.farm === 'Dino') {
      let result = await switchChain(137)
      if (result) {
        let dinoFarmContract = loadContract(library, MasterchefDinoAbi, dino_farm_address);
        await handleWrite(dinoFarmContract, "deposit", props.data.pid, 0);
      }
    }
  }

  useEffect(() => {
    async function loadData() {
      if (active && chainId && library) {
        await getData();
      }
    }

    loadData().then(res => {
      console.log("finished");
    })
  }, [account])

  function handleMax(val) {
    switch (val) {
      case "stake":
        setStakedPerc(100);
        break;
      case "unstake":
        setWithdrawPerc(100);
        break;
    }
  }

  const html = (<div className="row mt-2">
    <div className="col-lg-4 col-md-12 mx-auto">
      <div className="card box-green">
        <form>
          <div className="card-body">
            <p className="card-title">
              <label className="d_block" style={{textAlign:"left"}}>
                <a 
                  style={{ color: 'white', textDecoration: 'none' }} 
                  href={
                    props.data.farm === "1Inch" ? 
                      `${_1inch_url}?filter=1INCH&token0=${props.data.data.stakeCoins[0].address}&token1=${props.data.data.stakeCoins[1].address}`
                      :
                      (props.data.farm === "Sushi" ? `${sushi_url}/${props.data.token0}/${props.data.token1}`
                        :
                        (props.data.farm === "Dino" ? `${dino_url}/?t=d#/add/${props.data.token0}/${props.data.token1}`
                          :
                          `${quick_url}/${props.data.token0}/${props.data.token1}`
                        )
                      )
                  }
                  target="_blank"
                  > 
                  Add LP
                </a>
              </label>
              <label className="d_block float-right balance_wrap">Wallet Balance: {balance / 10**18}
              </label></p>
            <div className="form-group mt-3">
              <input id="balance" max={100} value={StakedPerc} onChange={handleInpChange} type="range" className="custom-range" />
            </div>
            <div className="form-group mt-3">
              <label className="float-left text-white">Stake(%): {StakedPerc}%</label>
              <label onClick={() => handleMax("stake")} className="float-right badge badge-danger">MAX</label>
            </div>
          </div>
          <div className="card-footer mt-4">
            <div className="row">
              <div className="col-md-12">
                {status ? <button onClick={Stake} type="button" className="btn btn-black btn-block">Stake</button> :
                  <button onClick={showconnect} type="button" className="btn btn-black btn-block">Connect Wallet</button>
                }

              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    <div className="col-lg-4 col-md-12 mx-auto">
      <div className="card box-green">
        <form>
          <div className="card-body">
            <p className="card-title unstake_mt"><label className="float-right balance_wrap">Your stake: {Staked / 10**18}</label></p>
            <div className="form-group mt-3">
              <input id="staked" max={100} value={WithdrawPerc} onChange={handleInpChange} type="range" className="custom-range" />
            </div>
            <div className="form-group mt-3">
              <label className="float-left text-white">Withdraw(%): {WithdrawPerc}%</label>
              <label onClick={() => handleMax("unstake")} className="float-right badge badge-danger">MAX</label>

            </div>
          </div>
          <div className="card-footer mt-4">
            <div className="row">

              <div className="col-md-12">
                {status ?
                  <button onClick={Unstake} type="button" className="btn btn-black btn-block">Unstake</button>
                  : <button onClick={showconnect} type="button" className="btn btn-black btn-block">Connect Wallet</button>
                }
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    <div className="col-lg-4 col-md-12 mx-auto">
      <div className="card box-green">
        <form>
          
          <div className="card-body">
            <div className="form-group mt-3">
              <h4 className="claim_sec">Your Reward <br></br> {Reward / 10**18}</h4>
            </div>
          </div>
          <div className="card-footer">
            <div className="row">
              <div className="col-md-12">
                {status ?
                  <button onClick={Claim} type="button" className="btn btn-black btn-block">Claim</button>
                  : <button onClick={showconnect} type="button" className="btn btn-black btn-block">Connect Wallet</button>
                }
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    <ModalConnect show={show} setShow={setShow} />
  </div>

  );

  return (html);
}

export default ExchangeCard;
